export type NotificationPreference = 'SPICY' | 'MILD' | 'NO_ROAST';
export type RoastConsent = NotificationPreference;
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
  joined_at?: string;
}

export interface MemberCreateRequest {
  user_id: string;
  name: string;
  handle?: string;
  paypal_email?: string;
  role?: string;
  roast_consent?: RoastConsent;
}

export interface MemberUpdateRequest {
  name?: string;
  paypal_email?: string;
  role?: string;
  roast_consent?: RoastConsent;
}

export interface ExpenseSplit {
  user_id: string;
  owes_cents: number;
  paid_status: PaymentStatus;
  paypal_order_id?: string;
  payment_url?: string;
}

export interface CustomSplitDto {
  user_id: string;
  owes_cents: number;
}

export interface ItemClaimDto {
  name: string;
  price_cents: number;
  claimed_by_user_ids: string[];
}

export interface ExpenseCreateRequest {
  expense_id?: string;
  paid_by: string;
  amount_cents: number;
  description: string;
  category?: 'LODGING' | 'FOOD' | 'TRANSPORT' | 'ACTIVITIES' | 'OTHER';
  split_type?: 'EQUAL' | 'EXACT' | 'ITEMIZED';
  split_with_user_ids?: string[];
  custom_splits?: CustomSplitDto[];
  items?: ItemClaimDto[];
  tax_cents?: number;
  tip_cents?: number;
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

export interface SettlementTransaction {
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  formatted_amount: string;
}

export interface TripLedger {
  trip_id: string;
  trip_name?: string;
  name?: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
  net_balances_cents: Record<string, number>;
  platform_escrow_cents?: number;
  simplified_settlements?: SettlementTransaction[];
  hours_elapsed: number;
}

export interface TripResponse {
  trip_id: string;
  name: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface TripCreateRequest {
  trip_id: string;
  name: string;
  currency?: string;
}

export interface DemoSeedResponse {
  message: string;
  trip: TripResponse;
  member_ids: string[];
  members: Member[];
  expenses: Expense[];
  ledger: TripLedger;
}

export interface SimTimeRequest {
  hours_to_advance: number;
}

export interface SimTimeResponse {
  trip_id: string;
  total_hours_advanced: number;
  effective_now: string;
  message: string;
}

export interface CreateOrderRequest {
  trip_id: string;
  debtor_id: string;
  expense_id: string;
  amount_cents?: number;
  currency?: string;
}

export interface CreateOrderResponse {
  order_id: string;
  approve_url: string;
  status: string;
  custom_id: string;
  amount_cents: number;
  formatted_amount: string;
}

export interface CaptureOrderResponse {
  order_id: string;
  capture_id: string;
  status: string;
  custom_id?: string;
  trip_id?: string;
  debtor_id?: string;
  expense_id?: string;
  amount_cents: number;
  payer_email?: string;
  settled_at?: string;
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
  image_card_base64?: string;
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

// === Python AI Microservice Interfaces ===

export interface ReceiptItem {
  index?: number;
  name: string;
  qty?: number;
  price_cents: number;
  claimed_by_user_ids?: string[];
}

export interface ReceiptParseRequest {
  trip_id: string;
  image_base64: string;
  currency?: string;
}

export interface ReceiptParseResponse {
  status: string;
  merchant: string;
  date: string;
  currency?: string;
  currency_symbol?: string;
  subtotal_cents: number;
  tax_cents: number;
  tip_cents: number;
  total_cents: number;
  items: ReceiptItem[];
  suggested_reply?: string;
}

export interface ItemizerSplitRequest {
  receipt: {
    merchant: string;
    subtotal_cents: number;
    tax_cents: number;
    tip_cents: number;
    total_cents: number;
    items: ReceiptItem[];
  };
  claims: Record<string, number[]>; // userId -> item indices
  all_members: string[];
  split_unclaimed_equally?: boolean;
}

export interface ItemizerSplitResponse {
  receipt_total_cents: number;
  is_balanced: boolean;
  discrepancy_cents: number;
  shares: Record<string, {
    user_id: string;
    items_subtotal_cents: number;
    proportional_tax_cents: number;
    proportional_tip_cents: number;
    total_cents: number;
    breakdown_text: string;
  }>;
}

export interface AgentDecideRequest {
  trip_id: string;
  sender_id: string;
  sender_name: string;
  message_text: string;
  active_members: { user_id: string; name: string; handle: string }[];
}

export interface AgentDecideResponse {
  action: 'LOG_EXPENSE' | 'CHECK_BALANCES' | 'DISPUTE_OR_PAUSE' | 'GENERAL_CHAT';
  confidence: number;
  parsed_data: {
    description?: string;
    amount_cents?: number;
    currency?: string;
    payer_id?: string;
    split_type?: 'EQUAL' | 'EXACT' | 'ITEMIZED';
    split_with_user_ids?: string[];
  };
  reply_text: string;
}

export interface EscalateRoastRequest {
  trip_id: string;
  debtor_id: string;
  debtor_name: string;
  debtor_handle?: string;
  creditor_name: string;
  amount_cents: number;
  currency?: string;
  expense_description: string;
  hours_overdue: number;
  tier: EscalationTier;
  roast_consent: RoastConsent;
  paypal_checkout_url?: string;
}

export interface EscalateRoastResponse {
  tier: EscalationTier;
  generated_text: string;
  image_card_base64?: string | null;
  call_to_action_buttons?: { text: string; url: string }[];
}

// === Authentication Interfaces ===

export interface AuthResponseDto {
  access_token: string;
  token_type?: string;
  user_id: string;
  email: string;
  name: string;
  handle: string;
  paypal_email?: string;
  role?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  name: string;
  handle: string;
  paypal_email: string;
}
