export type RoastConsent = 'MILD' | 'SPICY' | 'NO_ROAST';
export type UserRole = 'organizer' | 'member';
export type PaymentStatus = 'SETTLED' | 'PENDING' | 'ESCALATED';
export type EscalationTier = 
  | 'POLITE_CONCIERGE' 
  | 'PASSIVE_AGGRESSIVE' 
  | 'DISAPPOINTED_PARENT' 
  | 'PUBLIC_ROAST' 
  | 'ITINERARY_EMBARGO';

export interface Member {
  user_id: string;
  name: string;
  handle: string;
  paypal_email: string;
  role: UserRole;
  roast_consent: RoastConsent;
  avatar_url?: string;
  heat_score?: number; // 0 - 100
  tier?: EscalationTier;
}

export interface ExpenseSplit {
  user_id: string;
  owes_cents: number;
  paid_status: PaymentStatus;
  paypal_order_id?: string;
  payment_url?: string;
}

export interface Expense {
  expense_id: string;
  paid_by: string;
  amount_cents: number;
  description: string;
  category: 'LODGING' | 'FOOD' | 'TRANSPORT' | 'ACTIVITIES' | 'OTHER';
  timestamp: string;
  split_type: 'EQUAL' | 'EXACT' | 'ITEMIZED';
  splits: ExpenseSplit[];
}

export interface TripLedger {
  trip_id: string;
  trip_name: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
  net_balances_cents: Record<string, number>;
  hours_elapsed: number;
}

export interface ChatButton {
  text: string;
  url?: string;
  action?: string;
  payload?: any;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_handle: string;
  is_bot: boolean;
  timestamp: string;
  text: string;
  buttons?: ChatButton[];
  badge?: string;
  roast_tier?: EscalationTier;
  image_card_url?: string;
}

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SETTLED';
}

export interface PayPalEventLog {
  id: string;
  timestamp: string;
  event_type: 'CHECKOUT.ORDER.APPROVED' | 'PAYMENT.CAPTURE.COMPLETED' | 'PAYOUTSBATCH.SUCCESS' | 'ORDER.CREATED';
  summary: string;
  status: 'SUCCESS' | 'INFO';
  amount?: string;
  reference_id?: string;
}
