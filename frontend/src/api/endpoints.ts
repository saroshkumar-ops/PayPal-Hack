/**
 * Frozen REST Endpoints Contract between Frontend, Java Backend, and Python AI Microservice
 * Reference: docs/TEAM_COLLABORATION_GUIDE.md & backend/API_TESTING_HANDBOOK.md
 */

export const ENDPOINTS = {
  // === 1. Java Core Backend (Port 8080) ===
  TRIPS: {
    BASE: '/api/trips',
    BY_ID: (tripId: string) => `/api/trips/${tripId}`,
    SIM_TIME: (tripId: string) => `/api/trips/${tripId}/sim-time`,
    MEMBERS: (tripId: string) => `/api/trips/${tripId}/members`,
    MEMBER_BY_ID: (tripId: string, userId: string) => `/api/trips/${tripId}/members/${userId}`,
    EXPENSES: (tripId: string) => `/api/trips/${tripId}/expenses`,
    LEDGER: (tripId: string) => `/api/trips/${tripId}/ledger`,
    SETTLEMENTS: (tripId: string) => `/api/trips/${tripId}/settlements`,
  },

  // One-Click Demo Seeder
  DEMO: {
    SEED: '/api/demo/seed',
  },

  // PayPal Financial Gateway (Tasks C, D, E)
  PAYMENT: {
    CREATE_ORDER: '/api/payment/create-order',
    CAPTURE_ORDER: (orderId: string) => `/api/payment/capture/${orderId}`,
    SUCCESS: '/api/payment/success',
    CANCEL: '/api/payment/cancel',
    CONFIRM_BATCH_PAYOUT: (tripId: string) => `/api/trips/${tripId}/payout/confirm`,
    WEBHOOK: '/api/paypal/webhook',
  },

  // Chat Gateway (Task A)
  CHAT: {
    SEND_MESSAGE: '/api/chat/message',
    HISTORY: (tripId: string) => `/api/chat/${tripId}/history`,
  },

  // User Authentication & JWT (Port 8080)
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
  },

  // === 2. Python AI Microservice (Port 8001) ===
  AI: {
    HEALTH: '/health',
    AGENT_DECIDE: '/ai/agent/decide',
    AGENT_LOOP: '/ai/agent/loop',
    RECEIPT_PARSE: '/ai/receipt/parse',
    RECEIPT_UPLOAD: '/ai/receipt/upload',
    RECEIPT_SPLIT: '/ai/receipt/split',
    ESCALATE_ROAST: '/ai/escalate/roast',
  },
} as const;
