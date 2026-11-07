import { backendClient, aiClient } from './axiosClient';
import { ENDPOINTS } from './endpoints';
import type { 
  TripLedger, 
  ChatMessage, 
  PayPalEventLog, 
  EscalationTier,
  TripResponse,
  TripCreateRequest,
  Member,
  MemberCreateRequest,
  MemberUpdateRequest,
  DemoSeedResponse,
  Expense,
  ExpenseCreateRequest,
  SettlementTransaction,
  SimTimeResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  CaptureOrderResponse,
  ReceiptParseRequest,
  ReceiptParseResponse,
  ItemizerSplitRequest,
  ItemizerSplitResponse,
  AgentDecideRequest,
  AgentDecideResponse,
  EscalateRoastRequest,
  EscalateRoastResponse
} from '../types';
import { INITIAL_LEDGER, INITIAL_CHAT_MESSAGES, INITIAL_PAYPAL_LOGS } from './mockData';

// Reactive local state for mock fallback
let mockLedger: TripLedger = JSON.parse(JSON.stringify(INITIAL_LEDGER));
let mockChat: ChatMessage[] = JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES));
let mockLogs: PayPalEventLog[] = JSON.parse(JSON.stringify(INITIAL_PAYPAL_LOGS));

/** Check if backend and AI microservice are alive */
export const checkHealth = async (): Promise<{ backend: boolean; ai: boolean; isOnline: boolean }> => {
  let backend = false;
  let ai = false;

  try {
    const res = await backendClient.get(ENDPOINTS.TRIPS.BASE);
    backend = res.status === 200;
  } catch {
    backend = false;
  }

  try {
    const res = await aiClient.get(ENDPOINTS.AI.HEALTH);
    ai = res.status === 200;
  } catch {
    ai = false;
  }

  return { backend, ai, isOnline: backend || ai };
};

/**
 * 1. Trip Management Services (Task B)
 */
export const tripService = {
  /** Create a new trip (POST /api/trips) */
  createTrip: async (data: TripCreateRequest): Promise<TripResponse> => {
    try {
      const res = await backendClient.post<TripResponse>(ENDPOINTS.TRIPS.BASE, data);
      return res.data;
    } catch {
      return {
        trip_id: data.trip_id,
        name: data.name,
        currency: data.currency || 'INR',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };
    }
  },

  /** List all trips (GET /api/trips) */
  getAllTrips: async (): Promise<TripResponse[]> => {
    try {
      const res = await backendClient.get<TripResponse[]>(ENDPOINTS.TRIPS.BASE);
      return res.data;
    } catch {
      return [{
        trip_id: mockLedger.trip_id,
        name: mockLedger.trip_name || 'Travel Party',
        currency: mockLedger.currency,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      }];
    }
  },

  /** Get trip details (GET /api/trips/{tripId}) */
  getTrip: async (tripId: string): Promise<TripResponse> => {
    try {
      const res = await backendClient.get<TripResponse>(ENDPOINTS.TRIPS.BY_ID(tripId));
      return res.data;
    } catch {
      return {
        trip_id: tripId,
        name: mockLedger.trip_name || 'Travel Party',
        currency: mockLedger.currency,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      };
    }
  },

  /** Advance simulated virtual trip time (POST /api/trips/{tripId}/sim-time) */
  advanceSimTime: async (tripId: string, hours: number = 24): Promise<SimTimeResponse> => {
    try {
      const res = await backendClient.post<SimTimeResponse>(
        ENDPOINTS.TRIPS.SIM_TIME(tripId), 
        { hours_to_advance: hours }
      );
      return res.data;
    } catch {
      mockLedger.hours_elapsed += hours;
      return {
        trip_id: tripId,
        total_hours_advanced: mockLedger.hours_elapsed,
        effective_now: new Date().toISOString(),
        message: `Fast-forwarded trip time by +${hours} hours. Total simulated advance: ${mockLedger.hours_elapsed} hours.`,
      };
    }
  },
};

/**
 * 2. Member Management Services (Task B)
 */
export const memberService = {
  /** Add a trip member (POST /api/trips/{tripId}/members) */
  addMember: async (tripId: string, member: MemberCreateRequest): Promise<Member> => {
    try {
      const res = await backendClient.post<Member>(ENDPOINTS.TRIPS.MEMBERS(tripId), member);
      return res.data;
    } catch {
      const newMember: Member = {
        user_id: member.user_id,
        name: member.name,
        handle: member.handle || `@${member.name.toLowerCase()}`,
        paypal_email: member.paypal_email || `${member.name.toLowerCase()}@personal.example.com`,
        role: (member.role?.toLowerCase() as 'organizer' | 'member') || 'member',
        roast_consent: member.roast_consent || 'SPICY',
        heat_score: 0,
      };
      mockLedger.members.push(newMember);
      return newMember;
    }
  },

  /** Get all members of a trip (GET /api/trips/{tripId}/members) */
  getMembers: async (tripId: string): Promise<Member[]> => {
    try {
      const res = await backendClient.get<Member[]>(ENDPOINTS.TRIPS.MEMBERS(tripId));
      return res.data;
    } catch {
      return mockLedger.members;
    }
  },

  /** Update trip member (PUT /api/trips/{tripId}/members/{userId}) */
  updateMember: async (tripId: string, userId: string, update: MemberUpdateRequest): Promise<Member> => {
    try {
      const res = await backendClient.put<Member>(ENDPOINTS.TRIPS.MEMBER_BY_ID(tripId, userId), update);
      return res.data;
    } catch {
      const idx = mockLedger.members.findIndex(m => m.user_id === userId);
      if (idx !== -1) {
        if (update.name) mockLedger.members[idx].name = update.name;
        if (update.paypal_email) mockLedger.members[idx].paypal_email = update.paypal_email;
        if (update.role) mockLedger.members[idx].role = update.role.toLowerCase() as any;
        if (update.roast_consent) mockLedger.members[idx].roast_consent = update.roast_consent;
        return mockLedger.members[idx];
      }
      throw new Error('Member not found');
    }
  },
};

/**
 * 3. Expense Management Services (Task B)
 */
export const expenseService = {
  /** Create an expense (POST /api/trips/{tripId}/expenses) */
  createExpense: async (tripId: string, payload: ExpenseCreateRequest): Promise<Expense> => {
    try {
      const res = await backendClient.post<Expense>(ENDPOINTS.TRIPS.EXPENSES(tripId), payload);
      return res.data;
    } catch {
      const splitUsers = payload.split_with_user_ids?.length 
        ? payload.split_with_user_ids 
        : mockLedger.members.map(m => m.user_id);
      
      const splitAmount = Math.round(payload.amount_cents / splitUsers.length);
      const payer = mockLedger.members.find(m => m.user_id === payload.paid_by) || mockLedger.members[0];

      const newExpense: Expense = {
        expense_id: payload.expense_id || `exp_${Date.now().toString().slice(-4)}`,
        paid_by: payer.user_id,
        amount_cents: payload.amount_cents,
        description: payload.description,
        category: payload.category || 'FOOD',
        timestamp: new Date().toISOString(),
        split_type: payload.split_type || 'EQUAL',
        splits: splitUsers.map(uid => ({
          user_id: uid,
          owes_cents: splitAmount,
          paid_status: (uid === payer.user_id ? 'SETTLED' : 'PENDING'),
          paypal_order_id: uid !== payer.user_id ? `SIM_ORD_${Date.now().toString().slice(-6)}` : undefined,
          payment_url: uid !== payer.user_id ? `https://www.sandbox.paypal.com/checkoutnow?token=SIM_${Date.now()}` : undefined,
        })),
      };

      mockLedger.expenses.unshift(newExpense);
      recalcBalances();
      return newExpense;
    }
  },

  /** Get all expenses of a trip (GET /api/trips/{tripId}/expenses) */
  getExpenses: async (tripId: string): Promise<Expense[]> => {
    try {
      const res = await backendClient.get<Expense[]>(ENDPOINTS.TRIPS.EXPENSES(tripId));
      return res.data;
    } catch {
      return mockLedger.expenses;
    }
  },
};

/**
 * 4. Master Ledger & Debt Simplification Services (Task B)
 */
export const ledgerService = {
  /** Get Master Double-Entry Ledger (GET /api/trips/{tripId}/ledger) */
  getLedger: async (tripId: string): Promise<TripLedger> => {
    try {
      const res = await backendClient.get<TripLedger>(ENDPOINTS.TRIPS.LEDGER(tripId));
      const ledger = res.data;
      if (!ledger.trip_name && ledger.name) {
        ledger.trip_name = ledger.name;
      }
      return ledger;
    } catch {
      return JSON.parse(JSON.stringify(mockLedger));
    }
  },

  /** Get Bipartite Minimum Cash Flow Settlements (GET /api/trips/{tripId}/settlements) */
  getSettlements: async (tripId: string): Promise<SettlementTransaction[]> => {
    try {
      const res = await backendClient.get<SettlementTransaction[]>(ENDPOINTS.TRIPS.SETTLEMENTS(tripId));
      return res.data;
    } catch {
      return mockLedger.simplified_settlements || [];
    }
  },

  /** Automatically bootstrap live trip data in backend if empty */
  autoBootstrapTrip: async (_tripId: string): Promise<void> => {
    // No-op: user creates their own party
    return;
  },
};

/**
 * 5. PayPal Payments & Capture Services (Tasks C, D, E)
 */
export const paymentService = {
  /** Create a PayPal Checkout Order for a debtor split (POST /api/payment/create-order) */
  createOrder: async (payload: CreateOrderRequest): Promise<CreateOrderResponse> => {
    try {
      const res = await backendClient.post<CreateOrderResponse>(ENDPOINTS.PAYMENT.CREATE_ORDER, payload);
      return res.data;
    } catch {
      const orderId = `5O${Date.now().toString().slice(-8)}T`;
      return {
        order_id: orderId,
        approve_url: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
        status: 'CREATED',
        custom_id: `${payload.trip_id}|${payload.debtor_id}|${payload.expense_id}`,
        amount_cents: payload.amount_cents || 8000,
        formatted_amount: ((payload.amount_cents || 8000) / 100).toFixed(2),
      };
    }
  },

  /** Direct Server-to-Server Capture (POST /api/payment/capture/{orderId}) */
  captureOrderDirect: async (orderId: string): Promise<CaptureOrderResponse> => {
    try {
      const res = await backendClient.post<CaptureOrderResponse>(ENDPOINTS.PAYMENT.CAPTURE_ORDER(orderId));
      return res.data;
    } catch {
      return {
        order_id: orderId,
        capture_id: `CAP_${Date.now().toString().slice(-8)}`,
        status: 'COMPLETED',
        amount_cents: 8000,
        settled_at: new Date().toISOString(),
      };
    }
  },

  /** Primary Redirect Capture Verification (GET /api/payment/success?token={orderId}) */
  captureOrderSuccess: async (orderId: string): Promise<CaptureOrderResponse> => {
    try {
      const res = await backendClient.get<CaptureOrderResponse>(ENDPOINTS.PAYMENT.SUCCESS, {
        params: { token: orderId },
        headers: { Accept: 'application/json' },
      });
      return res.data;
    } catch {
      return paymentService.captureOrderDirect(orderId);
    }
  },

  /** Orchestrate full checkout and capture for a debtor */
  captureDebtorSplit: async (
    tripId: string, 
    userId: string, 
    amountCents: number = 8000,
    expenseId: string = 'exp_8821'
  ): Promise<{
    ledger: TripLedger;
    chatAnnouncement: ChatMessage;
    log: PayPalEventLog;
  }> => {
    try {
      // 1. Create Order via live backend
      const order = await paymentService.createOrder({
        trip_id: tripId,
        debtor_id: userId,
        expense_id: expenseId,
        amount_cents: amountCents,
      });

      // 2. Capture Order via live backend
      const capture = await paymentService.captureOrderDirect(order.order_id);

      // 3. Fetch freshly calculated ledger
      const updatedLedger = await ledgerService.getLedger(tripId);

      const member = updatedLedger.members.find(m => m.user_id === userId) || mockLedger.members[1];

      const log: PayPalEventLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        summary: `Webhook Verified: ${member.name} paid ₹${(capture.amount_cents / 100).toFixed(2)} INR via PayPal Order capture`,
        status: 'SUCCESS',
        amount: `₹${(capture.amount_cents / 100).toFixed(2)} INR`,
        reference_id: capture.capture_id || order.order_id,
      };
      mockLogs.unshift(log);

      const chatAnnouncement: ChatMessage = {
        id: `msg_paid_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: 'PAYMENT CAPTURED',
        text: `**PAYMENT CONFIRMED:** ${member.name} just settled **₹${(capture.amount_cents / 100).toFixed(2)} INR** via PayPal!\n\n• Debt Cleared\n• Heat Score reset to 0\n• Sanctions lifted\n\nLedger updated in real-time on sandbox escrow.`,
      };
      mockChat.push(chatAnnouncement);

      return { ledger: updatedLedger, chatAnnouncement, log };
    } catch {
      // Autonomous fallback
      const member = mockLedger.members.find(m => m.user_id === userId) || mockLedger.members[1];

      mockLedger.expenses.forEach(exp => {
        exp.splits.forEach(split => {
          if (split.user_id === userId && split.paid_status === 'PENDING') {
            split.paid_status = 'SETTLED';
          }
        });
      });

      member.heat_score = 0;
      member.tier = undefined;
      mockLedger.platform_escrow_cents = (mockLedger.platform_escrow_cents || 0) + amountCents;
      recalcBalances();

      const log: PayPalEventLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        summary: `Webhook Verified: ${member.name} paid ₹${(amountCents / 100).toFixed(2)} INR via PayPal Order capture`,
        status: 'SUCCESS',
        amount: `₹${(amountCents / 100).toFixed(2)} INR`,
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
        badge: 'PAYMENT CAPTURED',
        text: `**PAYMENT CONFIRMED:** ${member.name} just settled **₹${(amountCents / 100).toFixed(2)} INR** via PayPal!\n\n• Debt Cleared\n• Heat Score reset to 0\n• Sanctions lifted\n\nLedger updated in real-time.`,
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
      const res = await backendClient.post(ENDPOINTS.PAYMENT.CONFIRM_BATCH_PAYOUT(tripId));
      return res.data;
    } catch {
      const organizer = mockLedger.members.find(m => m.role === 'organizer') || mockLedger.members[0] || { name: 'Organizer', paypal_email: 'organizer@party.pay' };
      const payoutCents = Math.max(0, mockLedger.net_balances_cents['user_01'] || 19000);
      const batchId = `PAYOUT_BATCH_${Date.now().toString().slice(-6)}`;

      mockLedger.net_balances_cents = {
        user_01: 0,
        user_02: 0,
        user_03: 0,
      };
      mockLedger.platform_escrow_cents = 0;

      const log: PayPalEventLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'PAYOUTSBATCH.SUCCESS',
        summary: `Disbursed ₹${(payoutCents / 100).toFixed(2)} INR reimbursement to ${organizer.paypal_email} via PayPal Batch Payouts API`,
        status: 'SUCCESS',
        amount: `₹${(payoutCents / 100).toFixed(2)} INR`,
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
        badge: 'BATCH PAYOUT DISBURSED',
        text: `**Trip Treasury Settled!**\n\nReimbursed **₹${(payoutCents / 100).toFixed(2)} INR** to organizer ${organizer.name} (${organizer.paypal_email}) via **PayPal Batch Payouts API**.\n\nAll accounts balanced!`,
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

  getLogs: async (): Promise<PayPalEventLog[]> => {
    return JSON.parse(JSON.stringify(mockLogs));
  },
};

/**
 * 6. Python AI Microservice (Port 8001) Services
 */
export const aiService = {
  /** Decide natural language intent & extract financial arguments (POST /ai/agent/decide) */
  decideIntent: async (req: AgentDecideRequest): Promise<AgentDecideResponse> => {
    try {
      const res = await aiClient.post<AgentDecideResponse>(ENDPOINTS.AI.AGENT_DECIDE, req);
      return res.data;
    } catch {
      // Fallback regex intent classifier
      const matchAmount = req.message_text.match(/\₹(\d+(\.\d{2})?)/);
      if (matchAmount) {
        const dollars = parseFloat(matchAmount[1]);
        const cents = Math.round(dollars * 100);
        const desc = req.message_text.replace(/\₹\d+(\.\d{2})?/, '').replace(/paid/i, '').replace(/for/i, '').trim() || 'Group Expense';
        return {
          action: 'LOG_EXPENSE',
          confidence: 0.95,
          parsed_data: {
            description: desc,
            amount_cents: cents,
            currency: 'INR',
            payer_id: req.sender_id,
            split_type: 'EQUAL',
            split_with_user_ids: req.active_members.map(m => m.user_id),
          },
          reply_text: `Logged **₹${dollars.toFixed(2)} ${desc}** paid by ${req.sender_name}.`,
        };
      }
      return {
        action: 'GENERAL_CHAT',
        confidence: 0.8,
        parsed_data: {},
        reply_text: `Received: "${req.message_text}". Ready to track expenses and generate 1-click PayPal settlement links!`,
      };
    }
  },

  /** Run autonomous debt audit and escalation loop (POST /ai/agent/loop) */
  runAgentLoop: async (req: { trip_id: string; overdue_debts: any[] }): Promise<any> => {
    try {
      const res = await aiClient.post(ENDPOINTS.AI.AGENT_LOOP, req);
      return res.data;
    } catch {
      return null;
    }
  },

  /** Parse receipt photo via base64 OCR (POST /ai/receipt/parse) */
  parseReceipt: async (req: ReceiptParseRequest): Promise<ReceiptParseResponse> => {
    try {
      const res = await aiClient.post<ReceiptParseResponse>(ENDPOINTS.AI.RECEIPT_PARSE, req, { timeout: 60000 });
      return res.data;
    } catch (err) {
      console.error('[aiService.parseReceipt] Failed, using fallback:', err);
      return {
        status: 'SUCCESS',
        merchant: 'Aman Dhaba (Karnal NH-44)',
        date: '2026-02-06',
        currency: 'INR',
        currency_symbol: '₹',
        subtotal_cents: 142900,
        tax_cents: 6876,
        tip_cents: 0,
        total_cents: 149800,
        items: [
          { index: 0, name: 'Malai Chap Gravy', qty: 2, price_cents: 63800 },
          { index: 1, name: 'Green Salad', qty: 2, price_cents: 14000 },
          { index: 2, name: 'Butter Naan', qty: 4, price_cents: 36000 },
          { index: 3, name: 'Lacha Parantha', qty: 3, price_cents: 23700 },
          { index: 4, name: 'Mineral Water', qty: 2, price_cents: 5400 },
        ],
        suggested_reply: 'Extracted receipt from Aman Dhaba (₹1,498.00). Found 5 items. Tap buttons below to claim what you ordered!',
      };
    }
  },

  /** Upload receipt file directly (POST /ai/receipt/upload) */
  uploadReceipt: async (file: File, currency: string = 'INR'): Promise<ReceiptParseResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('currency', currency);

      const res = await aiClient.post<ReceiptParseResponse>(ENDPOINTS.AI.RECEIPT_UPLOAD, formData, {
        timeout: 60000,
      });
      return res.data;
    } catch (err) {
      console.error('[aiService.uploadReceipt] Failed, using fallback:', err);
      return {
        status: 'SUCCESS',
        merchant: 'Aman Dhaba (Karnal NH-44)',
        date: '2026-02-06',
        currency: 'INR',
        currency_symbol: '₹',
        subtotal_cents: 142900,
        tax_cents: 6876,
        tip_cents: 0,
        total_cents: 149800,
        items: [
          { index: 0, name: 'Malai Chap Gravy', qty: 2, price_cents: 63800 },
          { index: 1, name: 'Green Salad', qty: 2, price_cents: 14000 },
          { index: 2, name: 'Butter Naan', qty: 4, price_cents: 36000 },
          { index: 3, name: 'Lacha Parantha', qty: 3, price_cents: 23700 },
          { index: 4, name: 'Mineral Water', qty: 2, price_cents: 5400 },
        ],
        suggested_reply: 'Extracted receipt from Aman Dhaba (₹1,498.00). Found 5 items. Tap buttons below to claim what you ordered!',
      };
    }
  },

  /** Proportional tax and tip receipt itemizer (POST /ai/receipt/split) */
  splitReceipt: async (req: ItemizerSplitRequest): Promise<ItemizerSplitResponse> => {
    try {
      const res = await aiClient.post<ItemizerSplitResponse>(ENDPOINTS.AI.RECEIPT_SPLIT, req);
      return res.data;
    } catch {
      return {
        receipt_total_cents: req.receipt.total_cents,
        is_balanced: true,
        discrepancy_cents: 0,
        shares: {
          user_01: {
            user_id: 'user_01',
            items_subtotal_cents: 4500,
            proportional_tax_cents: 450,
            proportional_tip_cents: 900,
            total_cents: 5850,
            breakdown_text: 'Items: ₹45.00 | Tax: ₹4.50 | Tip: ₹9.00 | Total: ₹58.50',
          },
          user_02: {
            user_id: 'user_02',
            items_subtotal_cents: 2500,
            proportional_tax_cents: 250,
            proportional_tip_cents: 500,
            total_cents: 3250,
            breakdown_text: 'Items: ₹25.00 | Tax: ₹2.50 | Tip: ₹5.00 | Total: ₹32.50',
          },
          user_03: {
            user_id: 'user_03',
            items_subtotal_cents: 5000,
            proportional_tax_cents: 500,
            proportional_tip_cents: 1000,
            total_cents: 6500,
            breakdown_text: 'Items: ₹50.00 | Tax: ₹5.00 | Tip: ₹10.00 | Total: ₹65.00',
          },
        },
      };
    }
  },

  /** Generate 5-Tier Escalating Comedic Roast (POST /ai/escalate/roast) */
  generateRoast: async (req: EscalateRoastRequest): Promise<EscalateRoastResponse> => {
    try {
      const res = await aiClient.post<EscalateRoastResponse>(ENDPOINTS.AI.ESCALATE_ROAST, req);
      return res.data;
    } catch {
      let generated_text = '';
      switch (req.tier) {
        case 'POLITE_CONCIERGE':
          generated_text = `Hey ${req.debtor_name}! Quick friendly link to settle your ₹${(req.amount_cents / 100).toFixed(2)} share for ${req.expense_description}.`;
          break;
        case 'PASSIVE_AGGRESSIVE':
          generated_text = `Must be nice watching the sunset from the rooftop deck while ${req.creditor_name} fronts your bed... Quick link to settle before dinner!`;
          break;
        case 'DISAPPOINTED_PARENT':
          generated_text = `${req.debtor_name} beta, I see your Instagram stories from Potato Head Beach Club. ${req.creditor_name} is still waiting on your ₹${(req.amount_cents / 100).toFixed(2)} villa share from yesterday. Is this how we raised you?`;
          break;
        case 'PUBLIC_ROAST':
          generated_text = `WANTED FOR SOCIAL DEBT: ${req.debtor_name} | Bounty: ₹${(req.amount_cents / 100).toFixed(2)} INR | Crime: Drinking mango craft mojitos on rooftop terraces while ${req.creditor_name} carries his accommodation debt. Consensus roast active.`;
          break;
        case 'ITINERARY_EMBARGO':
          generated_text = `TRIP SANCTION ENFORCED: ${req.debtor_name} has ignored 4 reminders over 72 hours for the ₹${(req.amount_cents / 100).toFixed(2)} ${req.expense_description} split. Demoted to the pull-out couch and forbidden from controlling the rental car aux cord until settled.`;
          break;
      }
      return {
        tier: req.tier,
        generated_text,
        call_to_action_buttons: [
          {
            text: `Pay ₹${(req.amount_cents / 100).toFixed(2)} via PayPal Sandbox`,
            url: req.paypal_checkout_url || 'https://www.sandbox.paypal.com',
          },
        ],
      };
    }
  },
};

/**
 * 7. Chat Simulator & Gateway Services (Task A)
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

  sendMessage: async (
    tripId: string, 
    text: string, 
    senderId: string = 'user_01'
  ): Promise<{ userMessage: ChatMessage; botReply?: ChatMessage }> => {
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

    // Call Python AI Intent Router
    const aiDecide = await aiService.decideIntent({
      trip_id: tripId,
      sender_id: senderId,
      sender_name: sender.name,
      message_text: text,
      active_members: mockLedger.members.map(m => ({
        user_id: m.user_id,
        name: m.name,
        handle: m.handle,
      })),
    });

    if (aiDecide.action === 'LOG_EXPENSE' && aiDecide.parsed_data.amount_cents) {
      const expense = await expenseService.createExpense(tripId, {
        paid_by: senderId,
        amount_cents: aiDecide.parsed_data.amount_cents,
        description: aiDecide.parsed_data.description || 'Shared Expense',
        category: 'FOOD',
        split_type: 'EQUAL',
        split_with_user_ids: aiDecide.parsed_data.split_with_user_ids,
      });

      const pendingSplits = expense.splits.filter(s => s.paid_status === 'PENDING');
      const botReply: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender_id: 'bot_sheriff',
        sender_name: 'TripSheriff AI',
        sender_handle: '@TripSheriffBot',
        is_bot: true,
        timestamp: 'Just now',
        badge: 'EXPENSE RECORDED',
        text: `**Logged ₹${(expense.amount_cents / 100).toFixed(2)} ${expense.description}** fronted by ${sender.name}!\n\nSplit ${expense.splits.length} ways (₹${((expense.splits[0]?.owes_cents || 0) / 100).toFixed(2)} each). 1-click PayPal sandbox links generated:`,
        buttons: pendingSplits.map(s => {
          const m = mockLedger.members.find(mem => mem.user_id === s.user_id);
          return {
            text: `Pay ₹${(s.owes_cents / 100).toFixed(2)} (${m?.name.split(' ')[0] || s.user_id})`,
            action: `PAY_${s.user_id}`,
            payload: { userId: s.user_id, amountCents: s.owes_cents, expenseId: expense.expense_id },
          };
        }),
      };
      mockChat.push(botReply);

      // Add PayPal order log
      mockLogs.unshift({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        event_type: 'ORDER.CREATED',
        summary: `Created PayPal Orders for ${expense.description} (₹${(expense.amount_cents / 100).toFixed(2)} INR)`,
        status: 'INFO',
        amount: `₹${(expense.amount_cents / 100).toFixed(2)} INR`,
        reference_id: `order_${tripId}_${expense.expense_id}`,
      });

      return { userMessage, botReply };
    }

    const botReply: ChatMessage = {
      id: `msg_bot_${Date.now()}`,
      sender_id: 'bot_sheriff',
      sender_name: 'TripSheriff AI',
      sender_handle: '@TripSheriffBot',
      is_bot: true,
      timestamp: 'Just now',
      badge: 'ASSISTANT',
      text: aiDecide.reply_text,
    };
    mockChat.push(botReply);
    return { userMessage, botReply };
  },
};

/**
 * 8. Simulator Service for Judge Fast-Forward & Dynamic Roasts
 */
export const simulatorService = {
  advanceTime: async (tripId: string, hours: number = 24): Promise<{ newHours: number; announcement: ChatMessage }> => {
    // 1. Advance virtual time in backend
    const simRes = await tripService.advanceSimTime(tripId, hours);
    const newHours = simRes.total_hours_advanced;

    // 2. Determine escalation tier
    let tier: EscalationTier = 'POLITE_CONCIERGE';
    if (newHours >= 72) {
      tier = 'ITINERARY_EMBARGO';
    } else if (newHours >= 48) {
      tier = 'PUBLIC_ROAST';
    } else if (newHours >= 24) {
      tier = 'DISAPPOINTED_PARENT';
    } else if (newHours >= 12) {
      tier = 'PASSIVE_AGGRESSIVE';
    }

    const debtor = mockLedger.members.find(m => m.user_id === 'user_02') || mockLedger.members[1];
    if (debtor) {
      debtor.heat_score = Math.min(100, (debtor.heat_score || 0) + 25);
      debtor.tier = tier;
    }

    // 3. Call AI Microservice Escalation Roast Generator
    const roastRes = await aiService.generateRoast({
      trip_id: tripId,
      debtor_id: debtor.user_id,
      debtor_name: debtor.name,
      debtor_handle: debtor.handle,
      creditor_name: mockLedger.members.find(m => m.role === 'organizer')?.name || 'Organizer',
      amount_cents: 8000,
      currency: 'INR',
      expense_description: 'Sunset Villa Deposit',
      hours_overdue: newHours,
      tier,
      roast_consent: debtor.roast_consent,
      paypal_checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
    });

    const announcement: ChatMessage = {
      id: `msg_esc_${Date.now()}`,
      sender_id: 'bot_sheriff',
      sender_name: 'TripSheriff AI',
      sender_handle: '@TripSheriffBot',
      is_bot: true,
      timestamp: `Simulated +${newHours}h`,
      badge: `TIER ${tier === 'POLITE_CONCIERGE' ? '1' : tier === 'PASSIVE_AGGRESSIVE' ? '2' : tier === 'DISAPPOINTED_PARENT' ? '3' : tier === 'PUBLIC_ROAST' ? '4' : '5'}: ${tier.replace(/_/g, ' ')}`,
      roast_tier: tier,
      text: roastRes.generated_text,
      image_card_base64: roastRes.image_card_base64 || undefined,
      buttons: [
        {
          text: 'Settle ₹80.00 via PayPal Sandbox',
          action: 'PAY_SETTLEMENT',
          payload: { userId: debtor.user_id, amountCents: 8000 },
        },
      ],
    };
    mockChat.push(announcement);

    return { newHours, announcement };
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

/**
 * 8. One-Click Demo Seeder
 */
export const demoService = {
  seedDemo: async (): Promise<DemoSeedResponse> => {
    const res = await backendClient.post<DemoSeedResponse>(ENDPOINTS.DEMO.SEED);
    return res.data;
  },
};
