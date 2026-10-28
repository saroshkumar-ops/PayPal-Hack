import { backendClient, aiClient } from './axiosClient';
import { ENDPOINTS } from './endpoints';
import type { TripLedger, ChatMessage, PayPalEventLog, EscalationTier } from '../types';
import { INITIAL_LEDGER, INITIAL_CHAT_MESSAGES, INITIAL_PAYPAL_LOGS } from './mockData';

// Reactive local state for mock fallback
let mockLedger: TripLedger = JSON.parse(JSON.stringify(INITIAL_LEDGER));
let mockChat: ChatMessage[] = JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES));
let mockLogs: PayPalEventLog[] = JSON.parse(JSON.stringify(INITIAL_PAYPAL_LOGS));

/** Check if backend is alive */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await backendClient.get(ENDPOINTS.HEALTH);
    return res.status === 200;
  } catch {
    return false;
  }
};

/**
 * Ledger Services (Task B)
 */
export const ledgerService = {
  getLedger: async (tripId: string): Promise<TripLedger> => {
    try {
      const res = await backendClient.get<TripLedger>(ENDPOINTS.TRIPS.GET_LEDGER(tripId));
      return res.data;
    } catch {
      return JSON.parse(JSON.stringify(mockLedger));
    }
  },

  addExpense: async (tripId: string, expensePayload: {
    description: string;
    amount_cents: number;
    paid_by: string;
    category: 'LODGING' | 'FOOD' | 'TRANSPORT' | 'ACTIVITIES' | 'OTHER';
    split_with_user_ids?: string[];
  }): Promise<{ ledger: TripLedger; announcement?: ChatMessage }> => {
    try {
      const res = await backendClient.post(ENDPOINTS.TRIPS.ADD_EXPENSE(tripId), expensePayload);
      return res.data;
    } catch {
      // Mock computation with integer cent distribution
      const splitUsers = expensePayload.split_with_user_ids?.length 
        ? expensePayload.split_with_user_ids 
        : mockLedger.members.map(m => m.user_id);
      
      const splitAmount = Math.round(expensePayload.amount_cents / splitUsers.length);
      const payer = mockLedger.members.find(m => m.user_id === expensePayload.paid_by) || mockLedger.members[0];

      const newExpense = {
        expense_id: `exp_${Date.now().toString().slice(-4)}`,
        paid_by: payer.user_id,
        amount_cents: expensePayload.amount_cents,
        description: expensePayload.description,
        category: expensePayload.category,
        timestamp: new Date().toISOString(),
        split_type: 'EQUAL' as const,
        splits: splitUsers.map(uid => ({
          user_id: uid,
          owes_cents: splitAmount,
          paid_status: (uid === payer.user_id ? 'SETTLED' : 'PENDING') as any,
          payment_url: uid !== payer.user_id ? `https://www.sandbox.paypal.com/checkoutnow?token=SIM_${Date.now()}` : undefined,
        })),
      };

      mockLedger.expenses.unshift(newExpense);
      recalcBalances();

      const botReply: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: '🧾 EXPENSE RECORDED',
        text: `🍽️ **Logged $${(expensePayload.amount_cents / 100).toFixed(2)} ${expensePayload.description}** fronted by ${payer.name}!\n\nSplit ${splitUsers.length} ways ($${(splitAmount / 100).toFixed(2)}/person). Settle via PayPal:`,
        buttons: splitUsers
          .filter(uid => uid !== payer.user_id)
          .map(uid => {
            const m = mockLedger.members.find(mem => mem.user_id === uid);
            return {
              text: `💳 Pay $${(splitAmount / 100).toFixed(2)} (${m?.name.split(' ')[0]})`,
              action: `PAY_${uid}`,
              payload: { userId: uid, amountCents: splitAmount },
            };
          }),
      };
      mockChat.push(botReply);

      // Add PayPal order log
      mockLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'ORDER.CREATED',
        summary: `Created PayPal Orders for ${expensePayload.description} ($${(expensePayload.amount_cents / 100).toFixed(2)} USD)`,
        status: 'INFO',
        amount: `$${(expensePayload.amount_cents / 100).toFixed(2)} USD`,
      });

      return { ledger: JSON.parse(JSON.stringify(mockLedger)), announcement: botReply };
    }
  },
};

/**
 * Chat & Interaction Services (Task A)
 */
export const chatService = {
  getMessages: async (tripId: string): Promise<ChatMessage[]> => {
    try {
      const res = await backendClient.get<ChatMessage[]>(ENDPOINTS.CHAT.HISTORY(tripId));
      return res.data;
    } catch {
      return JSON.parse(JSON.stringify(mockChat));
    }
  },

  sendMessage: async (tripId: string, text: string, senderId: string = 'user_01'): Promise<{ userMessage: ChatMessage; botReply?: ChatMessage }> => {
    try {
      const res = await backendClient.post(ENDPOINTS.CHAT.SEND_MESSAGE, {
        trip_id: tripId,
        sender_id: senderId,
        message_text: text,
      });
      return res.data;
    } catch {
      const sender = mockLedger.members.find(m => m.user_id === senderId) || mockLedger.members[0];
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender_id: sender.user_id,
        sender_name: sender.name,
        sender_handle: sender.handle,
        is_bot: false,
        timestamp: 'Just now',
        text,
      };
      mockChat.push(userMessage);

      // Simple mock intent parser
      const matchAmount = text.match(/\$(\d+)/);
      if (matchAmount) {
        const cents = parseInt(matchAmount[1], 10) * 100;
        const desc = text.replace(/\$\d+/, '').replace(/paid/i, '').replace(/for/i, '').trim() || 'Shared Group Expense';
        const { announcement } = await ledgerService.addExpense(tripId, {
          description: desc,
          amount_cents: cents,
          paid_by: senderId,
          category: 'FOOD',
        });
        return { userMessage, botReply: announcement };
      }

      return { userMessage };
    }
  },
};

/**
 * Judge Simulator & Time-Warp Services (Task A Web)
 */
export const simulatorService = {
  advanceTime: async (tripId: string, hours: number = 24): Promise<{ newHours: number; announcement: ChatMessage }> => {
    try {
      const res = await backendClient.post(ENDPOINTS.TRIPS.ADVANCE_SIM_TIME(tripId), { hours_to_advance: hours });
      return res.data;
    } catch {
      mockLedger.hours_elapsed += hours;

      let tier: EscalationTier = 'POLITE_CONCIERGE';
      let text = '';
      let badge = '';

      if (mockLedger.hours_elapsed >= 72) {
        tier = 'ITINERARY_EMBARGO';
        badge = '⛔ TIER 5: ITINERARY EMBARGO';
        text = '🚨 **TRIP SANCTION ENFORCED:** Alex has ignored 4 reminders over 72 hours for the $80.00 Villa split.\n\nDemoted to the pull-out couch and forbidden from controlling the rental car aux cord until settled.';
      } else if (mockLedger.hours_elapsed >= 48) {
        tier = 'PUBLIC_ROAST';
        badge = '🎭 TIER 4: PUBLIC DEADBEAT ROAST';
        text = '🤠 **WANTED FOR SOCIAL DEBT: Alex Rivera**\n\nBounty: $80.00 USD | Crime: Drinking mango craft mojitos on rooftop terraces while Sarah carries his accommodation debt.\n\nConsensus roast active. Settle up to clear your name:';
      } else if (mockLedger.hours_elapsed >= 24) {
        tier = 'DISAPPOINTED_PARENT';
        badge = '🎭 TIER 3: DISAPPOINTED PARENT';
        text = 'Alex beta, I see your Instagram stories from Potato Head Beach Club 2 hours ago. Very glamorous. But Sarah is still waiting on your $80.00 villa share from yesterday. Is this how we raised you? To sip craft mezcal while your friend fronts your roof?';
      } else {
        tier = 'PASSIVE_AGGRESSIVE';
        badge = '👀 TIER 2: PASSIVE AGGRESSIVE';
        text = 'Must be nice watching the sunset from the rooftop deck while Sarah fronts your bed... 👀 Quick link to settle before dinner!';
      }

      // Update debtor heat score
      const debtor = mockLedger.members.find(m => m.user_id === 'user_02');
      if (debtor) {
        debtor.heat_score = Math.min(100, (debtor.heat_score || 0) + 25);
        debtor.tier = tier;
      }

      const announcement: ChatMessage = {
        id: `msg_esc_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: `Simulated +${mockLedger.hours_elapsed}h`,
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
      mockChat.push(announcement);

      return { newHours: mockLedger.hours_elapsed, announcement };
    }
  },
};

/**
 * PayPal Financial Services (Tasks C, D, E)
 */
export const paymentService = {
  getLogs: async (): Promise<PayPalEventLog[]> => {
    return JSON.parse(JSON.stringify(mockLogs));
  },

  /** Simulate capture on user click / redirect */
  captureOrder: async (tripId: string, userId: string, amountCents: number = 8000): Promise<{
    ledger: TripLedger;
    chatAnnouncement: ChatMessage;
    log: PayPalEventLog;
  }> => {
    try {
      const res = await backendClient.post(ENDPOINTS.PAYPAL.CAPTURE_ORDER, { trip_id: tripId, user_id: userId, amount_cents: amountCents });
      return res.data;
    } catch {
      const member = mockLedger.members.find(m => m.user_id === userId) || mockLedger.members[1];

      // Mark debts settled
      mockLedger.expenses.forEach(exp => {
        exp.splits.forEach(split => {
          if (split.user_id === userId && split.paid_status === 'PENDING') {
            split.paid_status = 'SETTLED';
          }
        });
      });

      member.heat_score = 0;
      member.tier = undefined;
      recalcBalances();

      const log: PayPalEventLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        summary: `Webhook Verified: ${member.name} paid $${(amountCents / 100).toFixed(2)} USD via PayPal Order capture`,
        status: 'SUCCESS',
        amount: `$${(amountCents / 100).toFixed(2)} USD`,
        reference_id: `capture_${Date.now().toString().slice(-6)}`,
      };
      mockLogs.unshift(log);

      const chatAnnouncement: ChatMessage = {
        id: `msg_paid_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: '🎉 PAYMENT CAPTURED',
        text: `🎉 **HALLELUJAH!** ${member.name} just settled **$${(amountCents / 100).toFixed(2)} USD** via PayPal!\n\n✅ Debt Cleared\n✅ Heat Score reset to 0\n✅ Sanctions lifted\n\nLedger updated in real-time.`,
      };
      mockChat.push(chatAnnouncement);

      return {
        ledger: JSON.parse(JSON.stringify(mockLedger)),
        chatAnnouncement,
        log,
      };
    }
  },

  /** Human-in-the-Loop Batch Payout Confirmation (Task D) */
  confirmBatchPayout: async (tripId: string): Promise<{
    success: boolean;
    batchId: string;
    totalCents: number;
    log: PayPalEventLog;
    chatAnnouncement: ChatMessage;
  }> => {
    try {
      const res = await backendClient.post(ENDPOINTS.PAYPAL.CONFIRM_BATCH_PAYOUT(tripId));
      return res.data;
    } catch {
      const sarah = mockLedger.members.find(m => m.user_id === 'user_01')!;
      const payoutCents = Math.max(0, mockLedger.net_balances_cents['user_01'] || 19000);
      const batchId = `PAYOUT_BATCH_${Date.now().toString().slice(-6)}`;

      mockLedger.net_balances_cents = {
        user_01: 0,
        user_02: 0,
        user_03: 0,
      };

      const log: PayPalEventLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'PAYOUTSBATCH.SUCCESS',
        summary: `Disbursed $${(payoutCents / 100).toFixed(2)} USD reimbursement to ${sarah.paypal_email} via PayPal Batch Payouts API`,
        status: 'SUCCESS',
        amount: `$${(payoutCents / 100).toFixed(2)} USD`,
        reference_id: batchId,
      };
      mockLogs.unshift(log);

      const chatAnnouncement: ChatMessage = {
        id: `msg_payout_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: '💸 BATCH PAYOUT DISBURSED',
        text: `💸 **Trip Treasury Settled!**\n\nReimbursed **$${(payoutCents / 100).toFixed(2)} USD** to organizer ${sarah.name} (${sarah.paypal_email}) via **PayPal Batch Payouts API**.\n\nAll accounts balanced! 🏖️🍹`,
      };
      mockChat.push(chatAnnouncement);

      return {
        success: true,
        batchId,
        totalCents: payoutCents,
        log,
        chatAnnouncement,
      };
    }
  },
};

/** Python AI Microservice (Port 8001 Placeholders) */
export const aiService = {
  parseReceipt: async (tripId: string, imageBase64: string) => {
    try {
      const res = await aiClient.post(ENDPOINTS.AI.RECEIPT_PARSE, {
        trip_id: tripId,
        image_base64: imageBase64,
        currency: 'USD',
      });
      return res.data;
    } catch {
      return {
        status: 'SUCCESS',
        merchant: 'Sunset Beach Bistro',
        date: '2026-10-28',
        subtotal_cents: 12000,
        tax_cents: 1200,
        tip_cents: 2400,
        total_cents: 15600,
        items: [
          { name: 'Grilled Red Snapper', qty: 1, price_cents: 4500 },
          { name: 'Truffle Fries', qty: 2, price_cents: 2500 },
          { name: 'Tropical Cocktails', qty: 3, price_cents: 5000 },
        ],
      };
    }
  },
};

function recalcBalances() {
  const balances: Record<string, number> = {
    user_01: 0,
    user_02: 0,
    user_03: 0,
  };

  mockLedger.expenses.forEach(exp => {
    const paidBy = exp.paid_by;
    let pendingOthers = 0;

    exp.splits.forEach(split => {
      if (split.user_id !== paidBy && split.paid_status === 'PENDING') {
        pendingOthers += split.owes_cents;
        balances[split.user_id] = (balances[split.user_id] || 0) - split.owes_cents;
      }
    });

    balances[paidBy] = (balances[paidBy] || 0) + pendingOthers;
  });

  mockLedger.net_balances_cents = balances;
}
