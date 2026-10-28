import type { TripLedger, ChatMessage, PayPalEventLog } from '../types';

export const INITIAL_LEDGER: TripLedger = {
  trip_id: 'trip_bali_2026',
  trip_name: 'Bali Reunion 2026 🌴',
  currency: 'USD',
  hours_elapsed: 36,
  members: [
    {
      user_id: 'user_01',
      name: 'Sarah Chen',
      handle: '@sarah_c',
      paypal_email: 'sarah.organizer@personal.example.com',
      role: 'organizer',
      roast_consent: 'SPICY',
      heat_score: 0,
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      user_id: 'user_02',
      name: 'Alex Rivera',
      handle: '@alex_travels',
      paypal_email: 'alex.debtor@personal.example.com',
      role: 'member',
      roast_consent: 'SPICY',
      heat_score: 75,
      tier: 'DISAPPOINTED_PARENT',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      user_id: 'user_03',
      name: 'Dave Kim',
      handle: '@dave_k',
      paypal_email: 'dave.payer@personal.example.com',
      role: 'member',
      roast_consent: 'MILD',
      heat_score: 20,
      tier: 'POLITE_CONCIERGE',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  ],
  expenses: [
    {
      expense_id: 'exp_8821',
      paid_by: 'user_01',
      amount_cents: 24000,
      description: 'Sunset Villa Deposit (Canggu)',
      category: 'LODGING',
      timestamp: '2026-10-26T14:30:00Z',
      split_type: 'EQUAL',
      splits: [
        { user_id: 'user_01', owes_cents: 8000, paid_status: 'SETTLED' },
        {
          user_id: 'user_02',
          owes_cents: 8000,
          paid_status: 'PENDING',
          paypal_order_id: '5O190127TN364715T',
          payment_url: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
        },
        {
          user_id: 'user_03',
          owes_cents: 8000,
          paid_status: 'PENDING',
          paypal_order_id: '7P281039TN364716U',
          payment_url: 'https://www.sandbox.paypal.com/checkoutnow?token=7P281039TN364716U',
        },
      ],
    },
    {
      expense_id: 'exp_8822',
      paid_by: 'user_01',
      amount_cents: 9000,
      description: 'Airport Private Van Shuttle',
      category: 'TRANSPORT',
      timestamp: '2026-10-27T09:15:00Z',
      split_type: 'EQUAL',
      splits: [
        { user_id: 'user_01', owes_cents: 3000, paid_status: 'SETTLED' },
        { user_id: 'user_02', owes_cents: 3000, paid_status: 'PENDING' },
        { user_id: 'user_03', owes_cents: 3000, paid_status: 'SETTLED' },
      ],
    },
  ],
  net_balances_cents: {
    user_01: 19000, // Sarah fronted $190
    user_02: -11000, // Alex owes $110
    user_03: -8000, // Dave owes $80
  },
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    sender_id: 'user_01',
    sender_name: 'Sarah Chen',
    sender_handle: '@sarah_c',
    is_bot: false,
    timestamp: '2 days ago',
    text: 'Hey crew! Just put down $240 for our Sunset Villa in Canggu 🌅🌴',
  },
  {
    id: 'msg_02',
    sender_id: 'bot_sheriff',
    sender_name: 'TripSheriff AI',
    sender_handle: '@TripSheriffBot',
    is_bot: true,
    timestamp: '2 days ago',
    badge: '🧾 EXPENSE LOGGED',
    text: '🏡 **Logged $240.00 Sunset Villa Deposit** paid by Sarah!\n\n• Sarah: $80.00 (Fronted)\n• Alex: $80.00 (Pending)\n• Dave: $80.00 (Pending)\n\nSettle your share via 1-click PayPal sandbox links below:',
    buttons: [
      { text: '💳 Pay $80.00 (Alex)', action: 'PAY_ALEX', payload: { userId: 'user_02', amountCents: 8000 } },
      { text: '💳 Pay $80.00 (Dave)', action: 'PAY_DAVE', payload: { userId: 'user_03', amountCents: 8000 } },
    ],
  },
  {
    id: 'msg_03',
    sender_id: 'user_02',
    sender_name: 'Alex Rivera',
    sender_handle: '@alex_travels',
    is_bot: false,
    timestamp: '1 day ago',
    text: 'Sick place!! Let me get back to my laptop tonight and ill pay',
  },
  {
    id: 'msg_04',
    sender_id: 'bot_sheriff',
    sender_name: 'TripSheriff AI',
    sender_handle: '@TripSheriffBot',
    is_bot: true,
    timestamp: 'Just now (Simulated +36h)',
    badge: '🎭 TIER 3: DISAPPOINTED PARENT',
    roast_tier: 'DISAPPOINTED_PARENT',
    text: 'Alex beta, I see the stories you posted from Potato Head Beach Club 2 hours ago. Very glamorous. But Sarah is still waiting on your $80.00 villa share from yesterday. We did not raise you to drink craft mango mojitos while your friend fronts your bed.',
    buttons: [
      {
        text: '💳 Settle $80.00 via PayPal Now',
        action: 'PAY_ALEX',
        payload: { userId: 'user_02', amountCents: 8000 },
      },
    ],
  },
];

export const INITIAL_PAYPAL_LOGS: PayPalEventLog[] = [
  {
    id: 'log_01',
    timestamp: '14:30:02 UTC',
    event_type: 'ORDER.CREATED',
    summary: 'Created PayPal Sandbox Order 5O190127TN364715T for Alex ($80.00 USD)',
    status: 'INFO',
    amount: '$80.00 USD',
    reference_id: 'trip_bali_2026_exp_8821_user_02',
  },
  {
    id: 'log_02',
    timestamp: '14:30:03 UTC',
    event_type: 'ORDER.CREATED',
    summary: 'Created PayPal Sandbox Order 7P281039TN364716U for Dave ($80.00 USD)',
    status: 'INFO',
    amount: '$80.00 USD',
    reference_id: 'trip_bali_2026_exp_8821_user_03',
  },
  {
    id: 'log_03',
    timestamp: '09:16:11 UTC',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    summary: 'Dave Kim paid $30.00 USD for Airport Shuttle via PayPal capture',
    status: 'SUCCESS',
    amount: '$30.00 USD',
    reference_id: 'trip_bali_2026_exp_8822_user_03',
  },
];
