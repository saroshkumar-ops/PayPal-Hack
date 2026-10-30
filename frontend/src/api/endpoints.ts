/**
 * Frozen REST Endpoints Contract between Frontend, Java Backend, and Python AI Microservice
 * Reference: docs/TEAM_COLLABORATION_GUIDE.md & docs/IMPLEMENTATION_PLAN.md
 */

export const ENDPOINTS = {
  // === 1. Java Core Backend (Port 8080) ===
  HEALTH: '/api/health',
  
  // Trip & Ledger Endpoints (Task B)
  TRIPS: {
    GET_LEDGER: (tripId: string) => `/api/trips/${tripId}/ledger`,
    ADD_EXPENSE: (tripId: string) => `/api/trips/${tripId}/expenses`,
    GET_MEMBERS: (tripId: string) => `/api/trips/${tripId}/members`,
    GET_SETTLEMENTS: (tripId: string) => `/api/trips/${tripId}/settlement-plan`,
    ADVANCE_SIM_TIME: (tripId: string) => `/api/trips/${tripId}/sim-time`,
    STREAM_EVENTS: (tripId: string) => `/api/trips/${tripId}/stream`,
  },

  // Chat Gateway (Task A)
  CHAT: {
    SEND_MESSAGE: '/api/chat/message',
    HISTORY: (tripId: string) => `/api/chat/${tripId}/history`,
  },

  // PayPal Financial Gateway (Tasks C, D, E)
  PAYPAL: {
    CREATE_ORDER: (tripId: string) => `/api/trips/${tripId}/checkout/order`,
    CAPTURE_ORDER: '/api/payment/capture',
    CONFIRM_BATCH_PAYOUT: (tripId: string) => `/api/trips/${tripId}/payout/confirm`,
    WEBHOOK_INGEST: '/api/paypal/webhook',
  },

  // === 2. Python AI Microservice (Port 8001) ===
  AI: {
    INTENT_DECIDE: '/ai/agent/decide',
    RECEIPT_PARSE: '/ai/receipt/parse',
    ROAST_GENERATE: '/ai/escalate/roast',
  },
} as const;
