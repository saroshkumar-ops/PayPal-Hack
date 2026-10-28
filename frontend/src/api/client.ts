import type { TripLedger, ChatMessage, PayPalEventLog, EscalationTier } from '../types';
import { INITIAL_LEDGER, INITIAL_CHAT_MESSAGES, INITIAL_PAYPAL_LOGS } from './mockData';

const JAVA_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// In-memory reactive state for mock mode
let currentLedger: TripLedger = JSON.parse(JSON.stringify(INITIAL_LEDGER));
let chatMessages: ChatMessage[] = JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES));
let paypalLogs: PayPalEventLog[] = JSON.parse(JSON.stringify(INITIAL_PAYPAL_LOGS));
let isMockMode = true; // Auto-fallback or manual toggle

export const apiClient = {
  getIsMockMode: () => isMockMode,
  setMockMode: (val: boolean) => { isMockMode = val; },

  /** Check if Java backend on port 8080 is reachable */
  checkBackendHealth: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${JAVA_BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Get Trip Ledger (Follows Contract 1 & 2) */
  getTripLedger: async (tripId: string): Promise<TripLedger> => {
    if (!isMockMode) {
      try {
        const res = await fetch(`${JAVA_BACKEND_URL}/api/trips/${tripId}/ledger`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Java backend not reachable, falling back to mock mode', err);
        isMockMode = true;
      }
    }
    return JSON.parse(JSON.stringify(currentLedger));
  },

  /** Get Chat Stream */
  getChatMessages: async (): Promise<ChatMessage[]> => {
    return JSON.parse(JSON.stringify(chatMessages));
  },

  /** Get PayPal Real-time Logs */
  getPayPalLogs: async (): Promise<PayPalEventLog[]> => {
    return JSON.parse(JSON.stringify(paypalLogs));
  },

  /** Post a user message to chat */
  postChatMessage: async (
    tripId: string, 
    text: string, 
    senderId: string = 'user_01'
  ): Promise<{ userMsg: ChatMessage; botReply?: ChatMessage }> => {
    const sender = currentLedger.members.find(m => m.user_id === senderId) || currentLedger.members[0];

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender_id: sender.user_id,
      sender_name: sender.name,
      sender_handle: sender.handle,
      is_bot: false,
      timestamp: 'Just now',
      text,
    };
    chatMessages.push(userMsg);

    // If live backend:
    if (!isMockMode) {
      try {
        const res = await fetch(`${JAVA_BACKEND_URL}/api/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: tripId, sender_id: sender.user_id, message_text: text }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.bot_reply) {
            chatMessages.push(data.bot_reply);
            return { userMsg, botReply: data.bot_reply };
          }
        }
      } catch {
        console.warn('Live backend failed, generating autonomous reply');
      }
    }

    // Autonomous Mock Logic:
    let botReply: ChatMessage | undefined;
    const lower = text.toLowerCase();

    if (lower.includes('paid') || lower.includes('split') || lower.includes('$')) {
      // Parse expense loosely in mock
      const matchAmount = text.match(/\$(\d+)/);
      const amountCents = matchAmount ? parseInt(matchAmount[1]) * 100 : 12000;
      const desc = text.replace(/\$\d+/, '').replace(/paid/i, '').replace(/for/i, '').trim() || 'Group Activity';

      const expId = `exp_${Date.now().toString().slice(-4)}`;
      const splitAmount = Math.round(amountCents / currentLedger.members.length);

      const newExpense = {
        expense_id: expId,
        paid_by: sender.user_id,
        amount_cents: amountCents,
        description: desc,
        category: 'FOOD' as const,
        timestamp: new Date().toISOString(),
        split_type: 'EQUAL' as const,
        splits: currentLedger.members.map(m => ({
          user_id: m.user_id,
          owes_cents: splitAmount,
          paid_status: (m.user_id === sender.user_id ? 'SETTLED' : 'PENDING') as any,
          payment_url: m.user_id !== sender.user_id ? `https://www.sandbox.paypal.com/checkoutnow?token=SIM_${Date.now()}` : undefined,
        })),
      };

      currentLedger.expenses.unshift(newExpense);
      recalculateNetBalances();

      botReply = {
        id: `msg_bot_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: '🧾 EXPENSE LOGGED',
        text: `🍽️ **Logged $${(amountCents / 100).toFixed(2)} ${desc}** paid by ${sender.name}!\n\nSplitting equally among ${currentLedger.members.length} members ($${(splitAmount / 100).toFixed(2)} each). Direct PayPal links generated:`,
        buttons: currentLedger.members
          .filter(m => m.user_id !== sender.user_id)
          .map(m => ({
            text: `💳 Pay $${(splitAmount / 100).toFixed(2)} (${m.name.split(' ')[0]})`,
            action: `PAY_${m.user_id}`,
            payload: { userId: m.user_id, amountCents: splitAmount, expenseId: expId },
          })),
      };
      chatMessages.push(botReply);

      // Add PayPal event logs
      paypalLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'ORDER.CREATED',
        summary: `Created PayPal Orders for ${desc} ($${(amountCents / 100).toFixed(2)} USD)`,
        status: 'INFO',
        amount: `$${(amountCents / 100).toFixed(2)} USD`,
        reference_id: `order_${tripId}_${expId}`,
      });
    }

    return { userMsg, botReply };
  },

  /** Advance simulated time (Judge testing control) */
  advanceSimulatedTime: async (_tripId: string, hours: number = 24): Promise<{ newHours: number; announcement?: ChatMessage }> => {
    currentLedger.hours_elapsed += hours;

    let tier: EscalationTier = 'POLITE_CONCIERGE';
    let text = '';
    let badge = '';

    if (currentLedger.hours_elapsed >= 72) {
      tier = 'ITINERARY_EMBARGO';
      badge = '⛔ TIER 5: ITINERARY EMBARGO';
      text = '🚨 **TRIP SANCTION APPLIED:** Alex has ignored 4 reminders over 72 hours for the $80.00 Villa split.\n\nDemoted to the pull-out couch and forbidden from controlling the rental car aux cord until settled.';
    } else if (currentLedger.hours_elapsed >= 48) {
      tier = 'PUBLIC_ROAST';
      badge = '🎭 TIER 4: PUBLIC DEADBEAT ROAST';
      text = '🤠 **WANTED FOR FINANCIAL NEGLIGENCE: Alex Rivera**\n\nBounty: $80.00 USD | Crime: Drinking mango craft mojitos while Sarah carries his accommodation debt.\n\nGroup consensus roast active. Settle up to clear your name:';
    } else if (currentLedger.hours_elapsed >= 24) {
      tier = 'DISAPPOINTED_PARENT';
      badge = '🎭 TIER 3: DISAPPOINTED PARENT';
      text = 'Alex beta, I see the stories you posted from Potato Head Beach Club 2 hours ago. Very glamorous. But Sarah is still waiting on your $80.00 villa share from yesterday. We did not raise you to drink craft mango mojitos while your friend fronts your bed.';
    } else {
      tier = 'PASSIVE_AGGRESSIVE';
      badge = '👀 TIER 2: PASSIVE AGGRESSIVE';
      text = 'Must be nice watching the sunset from the rooftop deck while Sarah fronts your bed... 👀 Settle up before dinner!';
    }

    // Update member heat score
    const alex = currentLedger.members.find(m => m.user_id === 'user_02');
    if (alex) {
      alex.heat_score = Math.min(100, (alex.heat_score || 0) + 25);
      alex.tier = tier;
    }

    const announcement: ChatMessage = {
      id: `msg_esc_${Date.now()}`,
      sender_id: 'bot_sheriff',
      sender_name: 'TripSheriff AI',
      sender_handle: '@TripSheriffBot',
      is_bot: true,
      timestamp: `Simulated +${currentLedger.hours_elapsed}h`,
      badge,
      roast_tier: tier,
      text,
      buttons: [
        {
          text: '💳 Settle $80.00 via PayPal Sandbox',
          action: 'PAY_ALEX',
          payload: { userId: 'user_02', amountCents: 8000 },
        },
      ],
    };

    chatMessages.push(announcement);
    return { newHours: currentLedger.hours_elapsed, announcement };
  },

  /** Simulate a member paying via PayPal Sandbox checkout */
  simulatePayPalCapture: async (
    _tripId: string, 
    userId: string, 
    amountCents: number = 8000
  ): Promise<{ updatedLedger: TripLedger; chatAnnouncement: ChatMessage; log: PayPalEventLog }> => {
    const member = currentLedger.members.find(m => m.user_id === userId) || currentLedger.members[1];

    // Mark pending splits for this user as settled
    currentLedger.expenses.forEach(exp => {
      exp.splits.forEach(split => {
        if (split.user_id === userId && split.paid_status === 'PENDING') {
          split.paid_status = 'SETTLED';
        }
      });
    });

    // Reset member's heat score
    member.heat_score = 0;
    member.tier = undefined;

    recalculateNetBalances();

    // Log the PayPal Webhook Event
    const log: PayPalEventLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: `Verified Webhook: ${member.name} paid $${(amountCents / 100).toFixed(2)} USD via PayPal Order capture`,
      status: 'SUCCESS',
      amount: `$${(amountCents / 100).toFixed(2)} USD`,
      reference_id: `capture_${Date.now().toString().slice(-6)}`,
    };
    paypalLogs.unshift(log);

    // Group chat celebration announcement
    const chatAnnouncement: ChatMessage = {
      id: `msg_paid_${Date.now()}`,
      sender_id: 'bot_sheriff',
      sender_name: 'TripSheriff AI',
      sender_handle: '@TripSheriffBot',
      is_bot: true,
      timestamp: 'Just now',
      badge: '🎉 PAYMENT CAPTURED',
      text: `🎉 **HALLELUJAH!** ${member.name} just settled **$${(amountCents / 100).toFixed(2)} USD** via PayPal!\n\n✅ Debt Cleared\n✅ Heat Score reset to 0\n✅ Demotion sanctions lifted\n\nLedger updated in real-time.`,
    };
    chatMessages.push(chatAnnouncement);

    return {
      updatedLedger: JSON.parse(JSON.stringify(currentLedger)),
      chatAnnouncement,
      log,
    };
  },

  /** Confirm & execute PayPal Batch Payout */
  confirmBatchPayout: async (
    _tripId: string
  ): Promise<{ success: boolean; batchId: string; totalCents: number; log: PayPalEventLog; chatAnnouncement: ChatMessage }> => {
    // Find who is owed money
    const sarah = currentLedger.members.find(m => m.user_id === 'user_01')!;
    const payoutCents = Math.max(0, currentLedger.net_balances_cents['user_01'] || 16000);
    const batchId = `PAYOUT_BATCH_${Date.now().toString().slice(-6)}`;

    // Reset balances upon complete payout
    currentLedger.net_balances_cents = {
      user_01: 0,
      user_02: 0,
      user_03: 0,
    };

    const log: PayPalEventLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      event_type: 'PAYOUTSBATCH.SUCCESS',
      summary: `Disbursed $${(payoutCents / 100).toFixed(2)} USD reimbursement to ${sarah.paypal_email} via PayPal Batch Payouts`,
      status: 'SUCCESS',
      amount: `$${(payoutCents / 100).toFixed(2)} USD`,
      reference_id: batchId,
    };
    paypalLogs.unshift(log);

    const chatAnnouncement: ChatMessage = {
      id: `msg_payout_${Date.now()}`,
      sender_id: 'bot_sheriff',
      sender_name: 'TripSheriff AI',
      sender_handle: '@TripSheriffBot',
      is_bot: true,
      timestamp: 'Just now',
      badge: '💸 BATCH PAYOUT DISBURSED',
      text: `💸 **Trip Treasury Settled!**\n\nReimbursed **$${(payoutCents / 100).toFixed(2)} USD** to organizer ${sarah.name} (${sarah.paypal_email}) via **PayPal Batch Payouts API**.\n\nAll trip accounts are now 100% balanced! 🏖️🍹`,
    };
    chatMessages.push(chatAnnouncement);

    return {
      success: true,
      batchId,
      totalCents: payoutCents,
      log,
      chatAnnouncement,
    };
  },
};

/** Helper to recompute net balances from expenses */
function recalculateNetBalances() {
  const balances: Record<string, number> = {
    user_01: 0,
    user_02: 0,
    user_03: 0,
  };

  currentLedger.expenses.forEach(exp => {
    const paidBy = exp.paid_by;
    let pendingFromOthers = 0;

    exp.splits.forEach(split => {
      if (split.user_id === paidBy) {
        // User paid for themselves
      } else {
        if (split.paid_status === 'PENDING') {
          pendingFromOthers += split.owes_cents;
          balances[split.user_id] = (balances[split.user_id] || 0) - split.owes_cents;
        }
      }
    });

    balances[paidBy] = (balances[paidBy] || 0) + pendingFromOthers;
  });

  currentLedger.net_balances_cents = balances;
}
