import type { TripLedger, ChatMessage, PayPalEventLog } from '../types';

export const EMPTY_LEDGER: TripLedger = {
  trip_id: '',
  trip_name: '',
  currency: 'INR',
  hours_elapsed: 0,
  members: [],
  expenses: [],
  net_balances_cents: {},
  platform_escrow_cents: 0,
  simplified_settlements: [],
};

export const INITIAL_LEDGER: TripLedger = {
  trip_id: 'trip_bali_2026',
  trip_name: 'Goa & Karnal Roadtrip 2026',
  currency: 'INR',
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
      amount_cents: 149800,
      description: 'Aman Dhaba Dinner (NH-44)',
      category: 'FOOD',
      timestamp: '2026-10-26T14:30:00Z',
      split_type: 'EQUAL',
      splits: [
        { user_id: 'user_01', owes_cents: 49934, paid_status: 'SETTLED' },
        {
          user_id: 'user_02',
          owes_cents: 49933,
          paid_status: 'PENDING',
          paypal_order_id: '5O190127TN364715T',
          payment_url: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
        },
        {
          user_id: 'user_03',
          owes_cents: 49933,
          paid_status: 'PENDING',
          paypal_order_id: '7P281039TN364716U',
          payment_url: 'https://www.sandbox.paypal.com/checkoutnow?token=7P281039TN364716U',
        },
      ],
    },
    {
      expense_id: 'exp_8822',
      paid_by: 'user_01',
      amount_cents: 90000,
      description: 'Airport Highway Toll & Cab',
      category: 'TRANSPORT',
      timestamp: '2026-10-27T09:15:00Z',
      split_type: 'EQUAL',
      splits: [
        { user_id: 'user_01', owes_cents: 30000, paid_status: 'SETTLED' },
        { user_id: 'user_02', owes_cents: 30000, paid_status: 'PENDING' },
        { user_id: 'user_03', owes_cents: 30000, paid_status: 'SETTLED' },
      ],
    },
  ],
  net_balances_cents: {
    user_01: 79933, // Sarah fronted ₹799.33
    user_02: -79933, // Alex owes ₹799.33
    user_03: -49933, // Dave owes ₹499.33
  },
  platform_escrow_cents: 0,
  simplified_settlements: [
    { from_user_id: 'user_02', to_user_id: 'user_01', amount_cents: 79933, formatted_amount: '799.33' },
    { from_user_id: 'user_03', to_user_id: 'user_01', amount_cents: 49933, formatted_amount: '499.33' },
  ],
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    sender_id: 'user_01',
    sender_name: 'Sarah Chen',
    sender_handle: '@sarah_c',
    is_bot: false,
    timestamp: '2 days ago',
    text: 'Hey crew! Paid ₹1,498 at Aman Dhaba for our group dinner.',
  },
  {
    id: 'msg_02',
    sender_id: 'bot_sheriff',
    sender_name: 'TripSheriff AI',
    sender_handle: '@TripSheriffBot',
    is_bot: true,
    timestamp: '2 days ago',
    badge: 'EXPENSE LOGGED',
    text: '**Logged ₹1,498.00 Aman Dhaba Dinner** paid by Sarah!\n\n• Sarah: ₹499.34 (Fronted)\n• Alex: ₹499.33 (Pending)\n• Dave: ₹499.33 (Pending)\n\nSettle your share via 1-click PayPal sandbox links below:',
    buttons: [
      { text: 'Pay ₹499.33 (Alex)', action: 'PAY_ALEX', payload: { userId: 'user_02', amountCents: 49933 } },
      { text: 'Pay ₹499.33 (Dave)', action: 'PAY_DAVE', payload: { userId: 'user_03', amountCents: 49933 } },
    ],
  },
  {
    id: 'msg_03',
    sender_id: 'user_02',
    sender_name: 'Alex Rivera',
    sender_handle: '@alex_travels',
    is_bot: false,
    timestamp: '1 day ago',
    text: 'Great food! Let me get back to my laptop tonight and ill settle up via PayPal.',
  },
  {
    id: 'msg_04',
    sender_id: 'bot_sheriff',
    sender_name: 'TripSheriff AI',
    sender_handle: '@TripSheriffBot',
    is_bot: true,
    timestamp: 'Just now (Simulated +36h)',
    badge: 'TIER 3: DISAPPOINTED PARENT',
    roast_tier: 'DISAPPOINTED_PARENT',
    text: 'Alex beta, I see the stories you posted from the cafe 2 hours ago. Very glamorous. But Sarah is still waiting on your ₹499.33 dinner share from yesterday. We did not raise you to eat butter naan and malai chap while your friend fronts your bill.',
    buttons: [
      {
        text: 'Settle ₹499.33 via PayPal Now',
        action: 'PAY_ALEX',
        payload: { userId: 'user_02', amountCents: 49933 },
      },
    ],
  },
];

export const INITIAL_PAYPAL_LOGS: PayPalEventLog[] = [
  {
    id: 'log_01',
    timestamp: '14:30:02 UTC',
    event_type: 'ORDER.CREATED',
    summary: 'Created PayPal Sandbox Order 5O190127TN364715T for Alex (₹499.33 INR)',
    status: 'INFO',
    amount: '₹499.33 INR',
    reference_id: 'trip_bali_2026_exp_8821_user_02',
  },
  {
    id: 'log_02',
    timestamp: '14:30:03 UTC',
    event_type: 'ORDER.CREATED',
    summary: 'Created PayPal Sandbox Order 7P281039TN364716U for Dave (₹499.33 INR)',
    status: 'INFO',
    amount: '₹499.33 INR',
    reference_id: 'trip_bali_2026_exp_8821_user_03',
  },
  {
    id: 'log_03',
    timestamp: '09:16:11 UTC',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    summary: 'Dave Kim paid ₹300.00 INR for Highway Cab via PayPal capture',
    status: 'SUCCESS',
    amount: '₹300.00 INR',
    reference_id: 'trip_bali_2026_exp_8822_user_03',
  },
];
