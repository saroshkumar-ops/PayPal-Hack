# TripSheriff AI - Autonomous Group Travel Treasury & Escalating Debt Enforcement Agent
## Master Implementation Plan (v1.0) — PayPal AI Hackathon 2026

This is not an abstract brainstorming sheet. It is a **priority-ordered, contract-first build plan** designed to take the project from zero to a winning submission for the **PayPal AI Hackathon** ($69,750+ prize pool). 

Every task is modular and can be implemented in parallel against mock contracts before end-to-end integration. Tasks near the top are **load-bearing**: without them, there is no working demo. Tasks near the bottom are high-value differentiators (sponsor prizes, dashboard, video storyboard).

---

## 1. What We Are Actually Building, Stated Honestly

**The Problem:** Group travel is a $1.2 Trillion social nightmare. One or two organizers inevitably front thousands of dollars for villas, rental cars, and group dinners on their personal credit cards. Afterward begins the agonizing "chasing friends" phase: awkward DMs, forgotten Venmo requests, manual math over who had drinks vs. who didn't, and lingering resentment. Over 43% of group travelers report damaged friendships or unrecovered debts.

**The Solution:** **TripSheriff AI** is an autonomous agentic group trip treasurer that lives directly inside the group chat (Telegram/WhatsApp). It:
1. **Tracks and itemizes expenses** through natural chat text, voice notes, and photo receipts (Multimodal AI).
2. **Maintains a mathematically verified double-entry group ledger** with smart debt-simplification algorithms.
3. **Dispatches instant 1-click PayPal payment links** via the **PayPal Orders API**.
4. **Executes automated multi-party settlements and vendor payments** in seconds via the **PayPal Batch Payouts API**.
5. **Chases deadbeat friends with an escalating psychological enforcement matrix** (Polite Concierge $\rightarrow$ Passive-Aggressive Roommate $\rightarrow$ Disappointed Parent $\rightarrow$ Public Roast Mode $\rightarrow$ Itinerary Embargo).
6. **Listens to real-time PayPal Webhooks** to dynamically celebrate payments, adjust debt scores, and close the loop.

**Honest Framing for Judges:** TripSheriff does not custody fiat money itself as an unregulated bank; it acts as an **orchestration and enforcement layer** delegating all money transmission, authentication, and regulatory compliance to **PayPal's global sandbox rails (Orders, Payouts, Invoicing)**. Frame it as: *"The autonomous CFO and social enforcer for consumer group spending."*

---

## 2. Hackathon Prize Alignment Strategy

This project is explicitly engineered to contend across three distinct prize surfaces:

| Target Category | Prize | Why This Architecture Wins It |
|---|---|---|
| **1st Place Grand Prize** | $12,000 | Combines serious commercial fintech viability (group travel treasury, Payouts API, Invoicing) with viral appeal, multi-currency handling, and production-grade architecture. |
| **Best Use of Agentic Commerce** | $5,000 | An AI agent with real tool-calling autonomy that creates PayPal orders, monitors webhook lifecycle, decides when to trigger payouts, and gates trip access based on ledger state. |
| **Best Demo Delivery** | $5,000 | The escalating debtor personality matrix (especially the "Disappointed Parent" voice/text and the Public Roast card) creates an unforgettable, laugh-out-loud 3-minute video that judges will remember. |
| **Sponsor Prize: Render** | Cash / Credits | Backend, Redis queue, and Telegram Webhooks containerized and hosted live on Render. |
| **Sponsor Prize: AG Grid** | Cash / Award | Trip Organizer Web Portal featuring a rich, interactive AG Grid enterprise ledger table with multi-currency sorting, receipt preview, and batch payout triggers. |

---

## 3. The Four Shared Contracts

Before writing any implementation code, the team locks these four JSON/API contracts. Anyone can write mock data and build their component (bot frontend, payment backend, AI personality engine) without waiting for others.

### Contract 1: Expense & Ledger Schema (`contracts/ledger.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "trip_id": "trip_bali_2026",
  "currency": "USD",
  "members": [
    {"user_id": "user_01", "name": "Sarah", "handle": "@sarah_c", "paypal_email": "sarah.buyer@sandbox.paypal.com", "role": "organizer"},
    {"user_id": "user_02", "name": "Alex", "handle": "@alex_travels", "paypal_email": "alex.debtor@sandbox.paypal.com", "role": "member"},
    {"user_id": "user_03", "name": "Dave", "handle": "@dave_k", "paypal_email": "dave.payer@sandbox.paypal.com", "role": "member"}
  ],
  "expenses": [
    {
      "expense_id": "exp_8821",
      "paid_by": "user_01",
      "amount": 240.00,
      "description": "Villa Sunset Deposit",
      "category": "LODGING",
      "timestamp": "2026-10-26T14:30:00Z",
      "split_type": "EQUAL",
      "splits": [
        {"user_id": "user_01", "owes": 80.00, "paid_status": "SETTLED"},
        {"user_id": "user_02", "owes": 80.00, "paid_status": "PENDING", "paypal_order_id": "ORD-9912048", "payment_url": "https://www.sandbox.paypal.com/checkoutnow?token=TOKEN1"},
        {"user_id": "user_03", "owes": 80.00, "paid_status": "PENDING", "paypal_order_id": "ORD-9912049", "payment_url": "https://www.sandbox.paypal.com/checkoutnow?token=TOKEN2"}
      ]
    }
  ],
  "net_balances": {
    "user_01": 160.00,
    "user_02": -80.00,
    "user_03": -80.00
  }
}
```

### Contract 2: Escalation & Personality State (`contracts/escalation.json`)
```json
{
  "user_id": "user_02",
  "trip_id": "trip_bali_2026",
  "total_overdue": 80.00,
  "currency": "USD",
  "unpaid_since_hours": 36,
  "reminders_sent": 2,
  "current_tier": "DISAPPOINTED_PARENT",
  "debt_heat_score": 75,
  "tone_policy": {
    "tier_1_hours": 0,
    "tier_2_hours": 12,
    "tier_3_hours": 24,
    "tier_4_hours": 48,
    "tier_5_hours": 72
  },
  "last_prompt_output": "Alex beta, I see the photos from the rooftop bar you posted 2 hours ago. Beautiful cocktail. But Sarah is still waiting for the $80 villa split from yesterday. We didn't raise you to drink top-shelf gin while your friend fronts your bed.",
  "paypal_quick_pay_url": "https://www.sandbox.paypal.com/checkoutnow?token=TOKEN1"
}
```

### Contract 3: PayPal Order & Payout Contract (`contracts/paypal_ops.json`)
```json
{
  "order_request": {
    "intent": "CAPTURE",
    "purchase_units": [{
      "reference_id": "exp_8821_user_02",
      "description": "TripSheriff: Villa Sunset Deposit share for Alex",
      "custom_id": "trip_bali_2026|user_02|exp_8821",
      "amount": {"currency_code": "USD", "value": "80.00"}
    }],
    "application_context": {
      "brand_name": "TripSheriff AI",
      "user_action": "PAY_NOW",
      "return_url": "https://tripsheriff.onrender.com/payment/success",
      "cancel_url": "https://tripsheriff.onrender.com/payment/cancel"
    }
  },
  "batch_payout_request": {
    "sender_batch_header": {
      "sender_batch_id": "batch_payout_trip_bali_2026_settle_01",
      "email_subject": "TripSheriff Settlement: You've received your trip reimbursement!",
      "email_message": "The trip ledger has been settled. Here is your consolidated reimbursement."
    },
    "items": [
      {
        "recipient_type": "EMAIL",
        "amount": {"value": "160.00", "currency": "USD"},
        "receiver": "sarah.buyer@sandbox.paypal.com",
        "note": "Reimbursement for Villa Sunset fronted expense",
        "sender_item_id": "settle_user_01"
      }
    ]
  }
}
```

### Contract 4: Chat Gateway Message Contract (`contracts/chat_message.json`)
```json
{
  "chat_id": "-100293847291",
  "platform": "telegram",
  "thread_id": null,
  "sender": {"id": "user_01", "name": "Sarah", "handle": "sarah_c"},
  "message_type": "TEXT",
  "content": "Paid $150 for seafood dinner split between @alex_travels and me",
  "media_url": null,
  "reply_to_message_id": null,
  "bot_response": {
    "text": "🍽️ Logged **$150.00 Seafood Dinner** by Sarah!\n\n• Sarah: $75.00 (Paid)\n• Alex: $75.00 (Pending)\n\nAlex, tap below to settle instantly via PayPal:",
    "buttons": [
      {"text": "💳 Pay $75 via PayPal", "url": "https://www.sandbox.paypal.com/checkoutnow?token=xyz123"},
      {"text": "📊 View Trip Ledger", "url": "https://tripsheriff.onrender.com/trips/trip_bali_2026"}
    ]
  }
}
```

---

## 4. Priority Build Tasks (A through M)

```
[Task A: Chat Gateway] ───► [Task B: Double-Entry Ledger] ───► [Task C: PayPal Orders API]
         │                              │                               │
         ▼                              ▼                               ▼
[Task F: Escalating AI Matrix]  [Task G: Receipt OCR]         [Task D: Batch Payouts API]
         │                              │                               │
         ▼                              ▼                               ▼
[Task E: Webhook Engine] ◄──────────────┴───────────────────────────────┘
         │
         ▼
[Task I: AG Grid Dashboard] ───► [Task J: Vendor Agent] ───► [Task L: Live Demo & Video]
```

---

### Task A: Telegram Bot Gateway & Session State Machine (Must-Have, Foundation)

**What it is:** The primary user interface where the trip lives. Listens to group messages, handles commands, maintains trip membership, and sends rich formatting with inline PayPal checkout buttons.

**Technical build:**
- Stack: Python 3.11+ using `python-telegram-bot` (v20+ async) or `aiogram`.
- Webhook Mode for Render deployment with local long-polling fallback for instant development (`TELEGRAM_POLLING=True`).
- Command handlers:
  - `/newtrip <trip_name> <currency>`: Creates trip context in SQLite/PostgreSQL.
  - `/join`: Registers user's Telegram ID, handle, and collects their PayPal sandbox email via a secure private 1:1 bot DM.
  - `/status` or `/ledger`: Prints net balance summary table directly in chat.
  - `/remind`: Manually triggers the agent's debt collection sweep.
  - `/settle`: Organizer command to initiate end-of-trip settlement via PayPal Payouts.
- Natural Language Ingestion: Any non-command message in the group is passed to the Agent Router (Task B/F) to determine if it's an expense report ("Paid $60 for gas"), a dispute, or casual chat (which the bot ignores unless tagged).

**End result:** A responsive bot running in a real Telegram group that correctly tracks participants, associates their PayPal sandbox emails, and responds with interactive inline keyboards.

**Benchmark to pass:**
- Responds to `/newtrip` and registers 3 users within 30 seconds.
- Inline keyboard buttons correctly direct the user to an external link.

---

### Task B: Double-Entry Group Ledger & Dynamic Split Math (Must-Have, Financial Core)

**What it is:** The mathematical engine that prevents rounding errors, simplifies circular debts (Greedy Debt Simplification algorithm), and computes accurate net balances.

**Technical build:**
- Do not store floating point numbers for currency; store integer cents (`int` in cents or `Decimal` with strict 2-decimal quantize).
- Split Algorithms supported:
  1. **Equal Split:** `amount // N` with remainder cents distributed deterministically to the payer or first member.
  2. **Custom / Exact Split:** Specified dollar amounts per user.
  3. **Itemized Split:** Mapping specific items from receipt extraction (Task G) to specific consumers.
- **Debt Simplification Algorithm:** Given a directed graph of who owes whom, apply bipartite minimum cash-flow reduction (Greedy max-creditor to max-debtor matching) so a group of 6 people settles in at most 5 transactions instead of 15.
- Persistence: SQLite / SQLAlchemy database with tables: `trips`, `trip_members`, `expenses`, `expense_splits`, `settlements`, `escalation_logs`.

**End result:** A deterministic Python module `ledger_engine.py` with 100% test coverage over split calculations, zero rounding discrepancies, and graph simplification.

**Benchmark to pass:**
- 10 unit test scenarios including weird numbers ($100 split 3 ways = $33.34, $33.33, $33.33; total exactly equals $100.00).
- Debt simplification reduces a 4-way circular debt (`A->B $20, B->C $20, C->A $20`) to $0 net.

---

### Task C: PayPal Orders & Instant Checkout Integration (Must-Have, Payment Backbone)

**What it is:** Generates real PayPal sandbox payment links for individual debts so debtors can click one button on their phone and pay via credit card, debit card, or PayPal balance.

**Technical build:**
- SDK / API: Direct REST calls to `https://api-m.sandbox.paypal.com/v2/checkout/orders` using OAuth2 Client Credentials (`/v1/oauth2/token`).
- Token Caching: Secure in-memory token cache with TTL refresh before 9-hour expiry.
- Payload Generation:
  - `intent`: `CAPTURE`
  - `custom_id`: Encodes `trip_id|debtor_user_id|expense_id` for zero-ambiguity webhook reconciliation.
  - `description`: "TripSheriff Settlement: {Expense Description}".
- Deep Link Extraction: Parse `links` where `rel == "approve"` to generate the immediate user checkout URL.
- Local capture verification endpoint: `/payment/success?token={order_id}` which calls `/v2/checkout/orders/{order_id}/capture` if webhooks have a slight network lag.

**End result:** Clicking the Telegram button opens the PayPal Sandbox checkout page, allows logging in as `buyer@personal.example.com`, and successfully completes payment.

**Benchmark to pass:**
- Order generated in under 800ms from chat trigger.
- Full end-to-end sandbox payment completes with a verified `COMPLETED` capture status.

---

### Task D: PayPal Batch Payouts & Invoicing Integration (Must-Have, Commercial Depth)

**What it is:** When the trip ends or when an organizer needs immediate reimbursement for fronted costs, TripSheriff triggers **PayPal Payouts API** to disburse funds to multiple members in a single API call. It also creates formal **PayPal Invoices** for shared rentals.

**Technical build:**
- **Batch Payouts Endpoint:** `POST /v1/payments/payouts`
  - Headers: `PayPal-Request-Id: {unique_idempotency_uuid}` (crucial: guarantees no double-payouts on retries).
  - Body: `sender_batch_header` + array of `items` containing `receiver` (email), `amount`, and `note`.
  - Polling / Webhook status: Listen to `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` or query `GET /v1/payments/payouts/{batch_id}`.
- **PayPal Invoicing Endpoint:** `POST /v2/invoicing/invoices` + `POST /v2/invoicing/invoices/{id}/send`
  - Generates formal PDF invoices for Airbnb host deposits or yacht charter vendor splits, including line-item tax and breakdown.
- **Safety Guard (Human-in-the-Loop):** The bot *never* executes a batch payout autonomously without an explicit organizer confirmation click (`Organizer clicks: [Confirm Batch Payout of $320.00 to 2 members]`).

**End result:** An organizer taps `/settle` in Telegram $\rightarrow$ bot previews net payouts $\rightarrow$ organizer approves $\rightarrow$ bot calls PayPal Payouts API $\rightarrow$ sandbox funds land in members' accounts within seconds.

**Benchmark to pass:**
- Successfully dispatches a batch payout to at least 2 distinct sandbox email accounts in one request.
- Idempotency key prevents duplicate execution on double-click.

---

### Task E: Real-Time PayPal Webhook Ingestion & Event Dispatcher (Must-Have, Closed Loop)

**What it is:** The event bridge that makes TripSheriff feel magical. The instant a friend pays on PayPal, PayPal fires a webhook to our server, which verifies the cryptographic signature, updates the ledger, and **immediately posts a celebration message in the Telegram group**.

**Technical build:**
- Endpoint: `POST /api/paypal/webhook` (FastAPI).
- Webhook Verification: Verify using PayPal's Webhook Signature Verification API (`POST /v1/notifications/verify-webhook-signature`) checking `auth_algo`, `cert_url`, `transmission_id`, `transmission_sig`, `transmission_time`, and `webhook_id`.
- Events to Handle:
  - `PAYMENT.CAPTURE.COMPLETED`: Unpacks `custom_id` $\rightarrow$ marks `expense_split.paid_status = 'SETTLED'` $\rightarrow$ drops user's Debt Heat Score to 0 $\rightarrow$ posts: *"🎉 HALLELUJAH! Alex has paid $80.00 for Villa Sunset! His name is cleared from the shame board."*
  - `PAYMENT.CAPTURE.DENIED` / `FAILED`: Alerts user in private DM to retry.
  - `PAYOUTSBATCH.SUCCESS`: Notifies group that trip reimbursements are complete.
- Local dev bridge: Use `ngrok` or `localtunnel` during development to route PayPal sandbox webhooks to `localhost:8000`.

**End result:** Zero-delay reactive feedback loop from PayPal checkout completion straight into the group chat.

**Benchmark to pass:**
- Webhook signature verification passes with valid PayPal test headers.
- Telegram announcement delivers within 3 seconds of sandbox payment capture.

---

### Task F: The Escalating Debt Enforcement Matrix ("Psychological Collector") (Centerpiece Feature)

**What it is:** The viral, hilarious, and psychologically effective core of the bot. As debt sits unpaid, the agent autonomously escalates its communication style across 5 distinct tiers.

**The 5 Escalation Tiers:**

```
[Tier 1: 0-12h]   Polite Concierge  ──► "Hey Alex! Quick link for your $80 villa split 🏖️"
       │
[Tier 2: 12-24h]  Passive-Aggressive ──► "Must be nice enjoying that rooftop sunset while Dave fronts your bed 👀"
       │
[Tier 3: 24-48h]  Disappointed Parent ──► "Alex beta, I'm not angry, just disappointed. Is this how we raised you?"
       │
[Tier 4: 48-72h]  Public Roast Mode ──► Posts generated meme card & ranks them #1 on the 'Deadbeat Leaderboard'
       │
[Tier 5: >72h]    Itinerary Embargo ──► "Sanction applied: Alex has been demoted to sleeping on the inflatable mattress"
```

**Technical build:**
- LLM Integration: OpenAI (`gpt-4o-mini`) or Google Gemini 1.5 Flash via structured prompt templates.
- Context injection: Inject actual trip context (recent expense description, debtor name, organizer name, days overdue, recent chat topics).
- Tone Safety Guardrails (Non-Negotiable):
  - Must remain comedic, playful, and socially relatable.
  - Hard guardrails against: hate speech, profanity, threats of violence, real-world personal harassment, or actual legal deception.
  - Debtor can type `/pause_reminders` or `/dispute` to immediately freeze escalation for manual review.
- Dynamic Card Generator: For Tier 4 (Public Roast), generate a quick SVG/Pillow image card: *"WANTED: Alex | For: $80 Villa Debt | Last seen: Ordering craft cocktails"* with a QR code directly linking to the PayPal Order.

**End result:** An autonomous reminder engine that generates personalized, context-aware, hilarious collection messages that friends actually laugh at and immediately pay.

**Benchmark to pass:**
- Produces distinct, high-quality responses for all 5 tiers given the same underlying ledger state.
- Strictly adheres to safety constraints (0 vulgarity, 100% comedy-first).

---

### Task G: Multimodal Receipt OCR & Interactive Itemizer (High Priority, AI Capability)

**What it is:** Users snap a photo of a restaurant receipt or grocery bill and drop it into the group chat. TripSheriff extracts the merchant, line items, prices, tax, and tip, then provides interactive buttons for members to claim what they ate/ordered.

**Technical build:**
- Input: Image message received in Telegram.
- Vision Model: Gemini 1.5 Flash or GPT-4o Vision API with structured JSON output schema:
  ```json
  {
    "merchant": "La Boheme Bistro",
    "date": "2026-10-26",
    "subtotal": 142.50,
    "tax": 12.50,
    "tip": 25.00,
    "total": 180.00,
    "items": [
      {"name": "Ribeye Steak", "qty": 1, "price": 45.00},
      {"name": "Truffle Pasta", "qty": 2, "price": 48.00},
      {"name": "Cocktails", "qty": 3, "price": 49.50}
    ]
  }
  ```
- Itemizer Logic: Pro-rates tax and tip proportionately across claimed items so alcohol consumers pay their fair share of the 20% gratuity.
- Interactive UX: The bot posts the receipt breakdown with Telegram Inline Callback Buttons:
  - `[🥩 Claim Ribeye ($45)]`
  - `[🍝 Claim Truffle Pasta ($24)]`
  - `[🍸 Claim Cocktails ($16.50)]`
  - `[✅ Done / Split Remainder Equal]`

**End result:** No more manual receipt math after a 12-person dinner. A single photo becomes a verified, itemized split in 10 seconds.

**Benchmark to pass:**
- Correctly parses a sample crumpled restaurant receipt image into valid JSON with math balancing within $0.05.

---

### Task H: Voice Note Expense Ingestion Engine (High Priority, Conversational AI)

**What it is:** While walking out of a taxi or store, the organizer holds the mic and sends a 5-second voice note: *"Hey Sheriff, just paid thirty-four dollars and fifty cents for the airport taxi, split between me, Alex, and Dave."* The bot logs it instantly.

**Technical build:**
- Telegram voice note (`.ogg` audio container) downloaded via Telegram Bot API.
- Audio pipeline: Transcribed via Whisper API or Gemini Audio into text.
- Tool-Calling Extractor: An LLM function-calling schema `log_expense(amount, currency, description, paid_by, split_with)` parses spoken intent into the ledger transaction.
- Confirmation Message: Bot replies in chat: *"🚕 Logged $34.50 Airport Taxi paid by Sarah. Split 3 ways ($11.50 each)."*

**End result:** Hands-free expense logging that removes all friction of opening an app or typing while traveling.

**Benchmark to pass:**
- Accurately processes spoken audio with background street noise into the correct amounts and member handles.

---

### Task I: Live Trip Dashboard with AG Grid (High Priority, Sponsor Prize & Organizer UX)

**What it is:** A clean, responsive web dashboard for the trip organizer, featuring an **AG Grid Enterprise/Community table** displaying real-time expenses, live settlement matrix, debt status, and receipt drill-downs.

**Technical build:**
- Frontend: Single-page React / Next.js or lightweight Vite + Tailwind application.
- **AG Grid Integration:**
  - Column definitions: Date, Category Icon, Description, Amount (with currency formatter), Paid By, Split Breakdown, Settlement Status (Colored Badges: `Paid`, `Pending`, `Escalated`).
  - AG Grid Features used: Column Filtering, Quick Search, Grouping by Category (Dining, Lodging, Transport), and custom Cell Renderers for PayPal Status.
- Live Updates: WebSocket or SSE (Server-Sent Events) from the FastAPI backend so whenever someone pays via PayPal, the AG Grid row flashes green and updates live without page reload.
- One-Click Actions: "Trigger Batch Payout" button and "Send Escalated Reminder" button right from the grid.

**End result:** A professional web portal that proves commercial viability and directly qualifies for the **AG Grid Sponsor Prize**.

**Benchmark to pass:**
- AG Grid renders seamlessly with 20+ mock expenses, supports instant sorting/filtering, and updates via WebSocket on payment event.

---

### Task J: Autonomous Vendor Booking Agent (High Priority, Agentic Commerce Track)

**What it is:** Bridges the gap between group collection and actual commercial payment. When pooled funds for a planned activity (e.g., Catamaran Charter: $600) reach 100% collection, the agent autonomously generates a formal PayPal Payout / invoice settlement to the tour vendor's business account.

**Technical build:**
- Target milestone tracking: Organizer sets a target (`/target Catamaran 600 vendor@balitours.com`).
- The bot pools individual member contributions into a virtual trip treasury.
- Real-time funding progress bar displayed in chat: `[████████░░] 80% ($480 / $600 collected)`.
- When the final payment clears via PayPal Webhook, the agent triggers an **Agentic Action**:
  - Prepares vendor Payout / Order.
  - Prompts organizer: *"🎯 Target Reached! All 6 members have paid for Catamaran Charter. Authorize instant $600 disbursement to Bali Tours?"*
  - On 1-click organizer biometric/chat confirmation, dispatches funds immediately via PayPal Payouts API.

**End result:** Direct qualification for the **"Best Use of Agentic Commerce" ($5,000)** prize by demonstrating autonomous goal-seeking agent behavior tied directly to PayPal rails.

**Benchmark to pass:**
- State machine successfully transitions from `COLLECTING` $\rightarrow$ `FUNDED` $\rightarrow$ `DISBURSED` with full audit logs.

---

### Task K: Cloud Deployment on Render (Medium Priority, Render Sponsor Prize)

**What it is:** Containerized cloud deployment of the FastAPI backend, PostgreSQL database, and Redis queue on Render.

**Technical build:**
- `render.yaml` Blueprint file configuring:
  - `web` service: FastAPI server running on Uvicorn.
  - `worker` service: Celery/RQ or background task loop for scheduled escalation sweeps.
  - `redis`: Render Key-Value store for rate limits and webhook message queues.
- Environment variable management for PayPal Sandbox credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`).
- Custom domain / Render public URL configured as the PayPal Webhook listener.

**End result:** Fully live, publicly accessible URL ready to be demoed to judges anywhere without local tunnels. Directly qualifies for the **Render Sponsor Prize**.

**Benchmark to pass:**
- Zero 500 errors on health check `/api/health`.
- Render logs show successful SSL webhook reception from PayPal Sandbox.

---

### Task L: Centerpiece Live Demo Script & 3-Minute Video Storyboard (Critical for "Best Demo Delivery")

**What it is:** The exact scene-by-scene script and rehearsal plan for the 3-minute video that judges watch. A brilliant technical project loses if the video is boring. This script guarantees maximum entertainment and technical credibility.

**3-Minute Video Storyboard (Timed to the Second):**

| Timestamp | Visual on Screen | Audio / Narration | Key Hackathon Hook |
|---|---|---|---|
| **0:00 - 0:30** | Split screen: A group beach selfie vs. a frantic organizer staring at a mountain of credit card bills. | *"Group trips are amazing... until someone has to collect the money. Meet Alex. Alex is on the beach in Bali. Alex has 'forgotten' his $80 villa split for two days."* | Hooks the audience with universal pain point. |
| **0:30 - 1:00** | Telegram group chat live screen. Organizer sends receipt photo $\rightarrow$ TripSheriff parses items instantly $\rightarrow$ Generates PayPal Orders link. | *"Instead of ruined friendships, meet TripSheriff AI. You drop a receipt or voice note. It itemizes the bill and spins up instant PayPal checkout links."* | Shows Multimodal OCR + PayPal Orders API. |
| **1:00 - 1:45** | The Escalation Sequence: Watch the bot send Tier 1, then fast-forward to Tier 3 (Disappointed Parent message), and Tier 4 (Generated Roast Card). | *"Alex ignores the polite reminder. So TripSheriff activates the Escalation Matrix. Level 3: Disappointed Parent. 'Alex beta, we didn't raise you to drink top-shelf gin while Sarah fronts your bed.' And when he still doesn't pay: The Public Deadbeat Roast Card."* | **The Viral Demo Hook.** Guaranteed to make judges laugh. |
| **1:45 - 2:15** | Alex taps "Pay via PayPal" on his phone. Instant biometric approval in Sandbox. Screen switches to Telegram: Bot instantly celebrates. AG Grid updates live. | *"Defeated by social psychology, Alex taps Pay. Behind the scenes, PayPal Sandbox captures the order. Webhook fires in 400ms. TripSheriff announces his redemption and clears his debt."* | Shows PayPal Checkout + Real-time Webhooks + AG Grid. |
| **2:15 - 2:45** | Trip finishes. Organizer types `/settle`. Bot aggregates balances and executes Batch Payouts to 2 members. | *"End of trip? One click triggers the PayPal Batch Payouts API. Everyone is reimbursed in seconds, with zero math and zero awkwardness."* | Shows PayPal Payouts API & Agentic Commerce. |
| **2:45 - 3:00** | Architectural diagram + GitHub repo link + Team sign-off. | *"Built with PayPal Developer Platform, Gemini 1.5, Render, and AG Grid. TripSheriff: Saving group trips, one debt at a time."* | Clean finish, sponsor shout-outs, credible closing. |

---

### Task M: Safety, Anti-Harassment Rails & Ethics Compliance (Critical for Technical Scrutiny)

**What it is:** Judges evaluate AI safety and practical viability. An automated collection bot that goes rogue or bullies users is a disqualification risk. This task establishes explicit, unbreachable safety fences.

**Technical build:**
- **Rate Limiting:** Max 1 automated reminder per 12 hours per debtor; maximum 4 total automated pings before defaulting to silent flag for the organizer.
- **Opt-Out & Dispute Protocol:** Any member can type `/optout`, `/pause`, or `/dispute` to immediately silence all automated bot messages and revert to manual organizer control.
- **Content Moderation Layer:** All LLM outputs pass through a regex + classification check blocking vulgarities, body shaming, racial/ethnic slurs, threats of physical harm, or genuine extortion terminology.
- **Financial Sandbox Separation:** Strict credential partitioning between Sandbox and live credentials; demo runs exclusively on PayPal Developer Sandbox with zero real-world financial risk.

**End result:** An ironclad safety policy that defends the project against any judge questions regarding harassment or liability.

**Benchmark to pass:**
- Adversarial test cases (prompt injections attempting to make the bot swear or threaten) are caught and replaced with a fallback comedic prompt.

---

## 5. Claims Ledger

Read this before recording the demo or writing the Devpost description. Every claim must fit strictly into these three tiers:

### Safe to Say Without Further Measurement:
- "TripSheriff integrates PayPal Orders API for inbound checkout and PayPal Batch Payouts API for outbound settlement."
- "The agent enforces payment through dynamic conversational escalation with human-in-the-loop safety rails."
- "All fiat currency movement and authentication are executed entirely within PayPal's compliant payment infrastructure."
- "Receipts are parsed using multimodal LLM vision with itemized proportional tax/tip allocation."

### Allowed Only After You Have Actually Verified It:
- "End-to-end webhook reaction latency is under [X] seconds" (measure your actual Render deployment).
- "Debt simplification reduces N transactions to [Y] transactions" (cite your exact benchmark run).
- "Successfully processed a batch payout across [Z] sandbox recipient accounts simultaneously."

### Never Claim, Regardless of How the Demo Goes:
- Never claim: "TripSheriff acts as a licensed bank, escrow provider, or registered money transmitter."
- Never claim: "100% autonomous vendor booking without human consent" (always maintain the human-in-the-loop approval step).
- Never claim: "Completely eliminates group travel debt" (it eliminates the social friction and manual tracking, but cannot physically force a user to have funds).
- Never claim: "Zero hallucinations" in receipt OCR (always present the interactive claim buttons as a user verification step).

---

## 6. Quick Reference: Tech Stack & API Matrix

### Backend & AI Stack:
- **Language / Framework:** Python 3.11+, FastAPI (REST + Webhook handling), `python-telegram-bot` (v20+ async)
- **Database:** SQLite (local dev) / PostgreSQL (Render production via SQLAlchemy 2.0)
- **AI Models:** 
  - Vision OCR: Google Gemini 1.5 Flash (receipt extraction)
  - Escalation Personality: GPT-4o-mini or Gemini 1.5 Flash (structured prompt templates)
  - Audio Transcription: Whisper API or Gemini Audio (voice note parsing)
- **Frontend / Dashboard:** React / Vite, Tailwind CSS, **AG Grid Community/Enterprise** (Sponsor Prize)
- **Deployment:** **Render** Web Service + Managed Redis (Sponsor Prize)

### PayPal Developer Platform APIs Used:
| PayPal API | Endpoint / Tool | Sandbox Use Case |
|---|---|---|
| **OAuth 2.0** | `POST /v1/oauth2/token` | Authenticates backend requests with Client ID & Secret |
| **Orders API (v2)** | `POST /v2/checkout/orders` | Creates individual payment orders for debt shares |
| **Batch Payouts API (v1)**| `POST /v1/payments/payouts` | Disburses consolidated reimbursements to multiple members |
| **Invoicing API (v2)** | `POST /v2/invoicing/invoices` | Generates auditable invoices for deposits and rentals |
| **Webhooks API** | `POST /v1/notifications/webhooks` | Subscribes to `PAYMENT.CAPTURE.COMPLETED`, `PAYOUTSBATCH.SUCCESS` |
| **Webhook Verification** | `POST /v1/notifications/verify-webhook-signature` | Cryptographically validates incoming PayPal webhook payloads |

### Required Environment Variables (`.env.example`):
```env
# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_registered_webhook_id_here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
# OR
GEMINI_API_KEY=your_gemini_api_key

# App Configuration
BASE_URL=https://tripsheriff.onrender.com
DATABASE_URL=sqlite:///./tripsheriff.db
SECRET_KEY=super_secure_random_key_here
```

---

## 7. Recommended Team Execution Order

If building in a team or solo sprint, execute in this exact sequence:

1. **Sprint Day 1 (Contracts & Core Loop):**
   - Lock the four schemas in Section 3.
   - Implement Task B (`ledger_engine.py`) and Task C (PayPal Orders client in sandbox).
   - Set up basic Telegram Bot (Task A) that generates a working PayPal payment link on command.

2. **Sprint Day 2 (Webhooks & The Escalation Engine):**
   - Connect Task E (PayPal Webhooks) with local `ngrok` so payments in sandbox announce in Telegram.
   - Build Task F (Escalating Personality Matrix with the 5 prompt templates).
   - Test the live "Disappointed Parent" reminder and "Payment Received" celebration loop.

3. **Sprint Day 3 (Multimodal Inputs & Payouts):**
   - Add Task G (Receipt photo OCR with itemizer buttons) and Task D (Batch Payouts on `/settle`).
   - Add Task H (Voice note expense logger).

4. **Sprint Day 4 (Sponsor Prizes, UI & Polish):**
   - Build Task I (AG Grid organizer dashboard).
   - Deploy backend to Render (Task K).
   - Run full safety checks (Task M).

5. **Sprint Day 5 (Demo Recording & Devpost Submission):**
   - Follow the 3-minute video storyboard (Task L) strictly.
   - Record high-quality screen captures with natural comedic pacing.
   - Publish YouTube video, finalize Devpost write-up, and link the public GitHub repository.
