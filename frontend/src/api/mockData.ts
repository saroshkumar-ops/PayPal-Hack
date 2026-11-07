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

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const INITIAL_PAYPAL_LOGS: PayPalEventLog[] = [];
