# TripSheriff AI - Autonomous Group Travel Treasury & Debt Enforcement Agent
## Master Implementation Plan (v2.0 - Production & Judge-Hardened)
### Target: PayPal AI Hackathon 2026 (Devpost) | Deadline: Nov 12, 2026

This is an engineering-first, contract-locked implementation plan for **TripSheriff AI**. 

Version 2.0 incorporates critical architectural fixes addressing PayPal Orders capture mechanics, platform fund routing realities, judge accessibility (dual-mode Telegram + Web Simulator), AI tool-calling agent loops, Render cold-start mitigations, and an aggressive, de-risked 16-day scope pruning schedule.

---

## 1. What We Are Actually Building, Stated Honestly

**The Problem:** Group trips inevitably create awkward social debt friction. One person fronts hundreds or thousands of dollars for accommodations, rental cars, and shared meals. Following the trip comes the painful manual collection process: tracking who ate or drank what, manually reminding friends across chat threads, and waiting weeks for people to settle up. Consumer financial studies (e.g. Bankrate, CreditCards.com) consistently show that over a third of adults experience ruined social relationships or unpaid debts from group travel.

**The Solution:** **TripSheriff AI** is an autonomous group travel treasury agent that operates across two synchronized interfaces:
1. **A live Telegram group bot** where friends naturally converse, drop photo receipts, and settle debts with 1-click PayPal buttons.
2. **A Hosted Web Simulator & Organizer Dashboard** enabling hackathon judges and organizers to test and inspect the entire agentic loop, ledger, and PayPal sandbox transactions in a single browser window without configuring Telegram.

**The Technical Core:**
- **Double-Entry Ledger:** Stores integer cents (`int`), handles itemized receipt splits, and runs bipartite minimum-cash-flow debt simplification.
- **Agentic Decision Loop:** An LLM-powered tool-calling coordinator that evaluates trip status, ledger balances, and overdue days to choose its next action (`create_payment_order`, `escalate_reminder`, `propose_payout_batch`).
- **Two-Step PayPal Orders Lifecycle:** Creates orders with `experience_context` and captures upon buyer approval via either immediate redirect capture (`/payment/success`) or the `CHECKOUT.ORDER.APPROVED` webhook.
- **PayPal Batch Payouts API:** Disburses pooled reimbursements to organizers and participants with mandatory Human-in-the-Loop confirmation.
- **Closed-Loop Real-Time Webhooks:** Signature-verified PayPal webhooks (`PAYMENT.CAPTURE.COMPLETED`, `PAYOUTSBATCH.SUCCESS`) that instantly trigger in-chat celebrations and ledger updates.
- **Consensual Escalating Personality Matrix:** Opt-in comedic escalation (Polite $\rightarrow$ Passive-Aggressive $\rightarrow$ Disappointed Parent $\rightarrow$ Public Roast Card $\rightarrow$ Itinerary Embargo).

**Honest Framing on Custody & Commercial Architecture (Mandatory for Judges):**
> [!IMPORTANT]
> **Regulatory & Platform Routing Disclosure:**
> In this hackathon demonstration, incoming member payments are collected into the prototype's PayPal sandbox platform account as a pooled escrow proxy, and outbound settlements are disbursed using the PayPal Batch Payouts API. 
> 
> We explicitly state to judges that **TripSheriff operates as a platform-mediated prototype**. In a production commercial release, direct multi-party funds routing would be implemented using **PayPal Complete Payments / PayPal Commerce Platform (Marketplace Payee Routing)** with custom payee declarations in `purchase_units` or licensed third-party custodial rails. We do **not** claim to be an independent non-custodial bank.

---

## 2. Hackathon Prize Alignment Strategy

| Target Category | Prize | Why This Architecture Wins It |
|---|---|---|
| **1st Place Grand Prize** | $12,000 | Production-grade PayPal depth (Orders capture, Batch Payouts, Webhook verification), dual-mode interface (Telegram + Web Simulator), rigorous math, and commercial viability. |
| **Best Use of Agentic Commerce** | $5,000 | True LLM tool-calling agent loop that autonomously evaluates debt aging, selects payment actions, requests Human-in-the-Loop approvals, and drives commerce on PayPal rails. |
| **Best Demo Delivery** | $5,000 | The hilarious, consensual escalating debt collector matrix (featuring the "Disappointed Parent" voice/text and dynamic Roast Cards), backed by a timed 3-minute video storyboard with zero dead air. |
| **Sponsor Prize: AG Grid** | Cash / Award | Interactive AG Grid Enterprise/Community table powering the Trip Organizer Dashboard with real-time WebSocket updates, multi-currency formatting, and settlement triggers. |
| **Sponsor Prize: Render** | Cash / Credits | Complete containerized deployment on Render with keep-alive worker configuration preventing webhook sleep drops. |

---

## 3. The Four Shared Locked Contracts

These contracts must be locked on Day 1. Every component (bot, web simulator, payment backend, agent loop) can be built against these JSON schemas in isolation using mocks.

### Contract 1: Expense & Ledger Schema (`contracts/ledger.json`)
*Note: All monetary values are strictly stored as integer cents to eliminate floating-point rounding errors.*
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "trip_id": "trip_bali_2026",
  "currency": "USD",
  "members": [
    {
      "user_id": "user_01",
      "name": "Sarah",
      "handle": "@sarah_c",
      "paypal_email": "sarah.organizer@personal.example.com",
      "role": "organizer",
      "roast_consent": "SPICY"
    },
    {
      "user_id": "user_02",
      "name": "Alex",
      "handle": "@alex_travels",
      "paypal_email": "alex.debtor@personal.example.com",
      "role": "member",
      "roast_consent": "SPICY"
    },
    {
      "user_id": "user_03",
      "name": "Dave",
      "handle": "@dave_k",
      "paypal_email": "dave.payer@personal.example.com",
      "role": "member",
      "roast_consent": "MILD"
    }
  ],
  "expenses": [
    {
      "expense_id": "exp_8821",
      "paid_by": "user_01",
      "amount_cents": 24000,
      "description": "Sunset Villa Deposit",
      "category": "LODGING",
      "timestamp": "2026-10-26T14:30:00Z",
      "split_type": "EQUAL",
      "splits": [
        {"user_id": "user_01", "owes_cents": 8000, "paid_status": "SETTLED"},
        {
          "user_id": "user_02",
          "owes_cents": 8000,
          "paid_status": "PENDING",
          "paypal_order_id": "5O190127TN364715T",
          "payment_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T"
        },
        {
          "user_id": "user_03",
          "owes_cents": 8000,
          "paid_status": "PENDING",
          "paypal_order_id": "7P281039TN364716U",
          "payment_url": "https://www.sandbox.paypal.com/checkoutnow?token=7P281039TN364716U"
        }
      ]
    }
  ],
  "net_balances_cents": {
    "user_01": 16000,
    "user_02": -8000,
    "user_03": -8000
  }
}
```

### Contract 2: Agentic Tool-Calling & Escalation State (`contracts/agent_state.json`)
```json
{
  "debtor_id": "user_02",
  "trip_id": "trip_bali_2026",
  "total_overdue_cents": 8000,
  "currency": "USD",
  "unpaid_since_hours": 36,
  "reminders_sent": 2,
  "current_tier": "DISAPPOINTED_PARENT",
  "debt_heat_score": 75,
  "roast_consent": "SPICY",
  "agent_decision": {
    "action": "ESCALATE_AND_REMIND",
    "target_channel": "GROUP_CHAT",
    "selected_tool": "send_escalated_message",
    "parameters": {
      "tier": "DISAPPOINTED_PARENT",
      "tone": "Comedic, guilt-inducing, family elder voice",
      "generated_text": "Alex beta, I see your Instagram stories from the beach club. Very nice. But Sarah is still waiting on the $80 villa deposit from yesterday. We did not raise you to drink craft mango mojitos while your friend fronts your bed.",
      "checkout_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T"
    }
  }
}
```

### Contract 3: PayPal Order & Payout Contract (`contracts/paypal_ops.json`)
```json
{
  "create_order_payload": {
    "intent": "CAPTURE",
    "purchase_units": [{
      "reference_id": "trip_bali_2026_exp_8821_user_02",
      "description": "TripSheriff: Villa Deposit share for Alex",
      "custom_id": "trip_bali_2026|user_02|exp_8821",
      "amount": {
        "currency_code": "USD",
        "value": "80.00"
      }
    }],
    "payment_source": {
      "paypal": {
        "experience_context": {
          "brand_name": "TripSheriff AI",
          "locale": "en-US",
          "landing_page": "LOGIN",
          "user_action": "PAY_NOW",
          "return_url": "https://tripsheriff.onrender.com/api/payment/success",
          "cancel_url": "https://tripsheriff.onrender.com/api/payment/cancel"
        }
      }
    }
  },
  "batch_payout_payload": {
    "sender_batch_header": {
      "sender_batch_id": "batch_payout_trip_bali_2026_settle_01",
      "email_subject": "TripSheriff: Your Trip Reimbursement is Here!",
      "email_message": "The trip ledger has been settled. Funds have been disbursed to your account."
    },
    "items": [
      {
        "recipient_type": "EMAIL",
        "amount": {"value": "160.00", "currency": "USD"},
        "receiver": "sarah.organizer@personal.example.com",
        "note": "TripSheriff: Net reimbursement for fronted villa costs",
        "sender_item_id": "settle_sarah_01"
      }
    ]
  }
}
```

### Contract 4: Chat Gateway & Web Simulator Event Contract (`contracts/chat_event.json`)
```json
{
  "event_id": "evt_991823",
  "source": "TELEGRAM_OR_SIMULATOR",
  "trip_id": "trip_bali_2026",
  "sender": {"id": "user_01", "name": "Sarah", "handle": "@sarah_c"},
  "message_type": "TEXT",
  "content": "Paid $150 for seafood dinner split with @alex_travels",
  "bot_response": {
    "text": "🍽️ **Logged $150.00 Seafood Dinner** paid by Sarah!\n\n• Sarah: $75.00 (Fronted)\n• Alex: $75.00 (Pending)\n\nAlex, settle instantly via PayPal:",
    "buttons": [
      {"text": "💳 Pay $75.00 via PayPal", "url": "https://www.sandbox.paypal.com/checkoutnow?token=TOKEN_XYZ"},
      {"text": "📊 View Trip Ledger", "url": "https://tripsheriff.onrender.com/trips/trip_bali_2026"}
    ]
  }
}
```

---

## 4. Prioritized & De-risked Build Tasks

To ensure guaranteed submission before the **November 12** deadline, tasks are divided into **Tier 1 (Core Backbone)**, **Tier 2 (Sponsor & AI Differentiators)**, and **Deferred/Stretch**.

```
[Phase 1: Days 1-5]  Task B (Ledger Math) ──► Task C (Orders + Capture) ──► Task E (Webhooks)
                               │                           │                        │
                               ▼                           ▼                        ▼
                     Task F (Agent & Matrix) ◄──── Task A (Bot & Web Simulator Gateway)
                               │
[Phase 2: Days 6-10] Task D (Payouts API) ──► Task G (Receipt OCR) ──► Task I (AG Grid Web Portal)
                               │
[Phase 3: Days 11-13] Task K (Render Hosting + Keep-Alive) ──► Task M (Safety Guardrails)
                               │
[Phase 4: Days 14-16] Task L (Live Rehearsal, 3-Min Video Storyboard & Devpost Submission)
```

---

### Task B: Double-Entry Group Ledger & Debt Simplification (Must-Have, Core Math)

**What it is:** The mathematical heart of the system. Maintains an immutable log of transactions in integer cents, splits expenses, and optimizes multi-party net balances.

**Technical build:**
- Store all amounts as integer cents (`amount_cents = int(round(val * 100))`). Output formatted strings `f"{amount_cents / 100:.2f}"` only when interfacing with PayPal API or rendering chat messages.
- Implement the **Bipartite Minimum Cash Flow algorithm** (Greedy matching of max net debtor to max net creditor) to reduce $O(N^2)$ debts to at most $N-1$ settlement transactions.
- Split types: Equal split (with remainder cents assigned deterministically), exact dollar split, and itemized split (from Task G).
- Persistence: SQLite / SQLAlchemy database with models for `Trip`, `User`, `Expense`, `ExpenseSplit`, `Settlement`.

**Benchmark to pass:**
- 100% test coverage on split calculations with zero floating-point drift.
- Circular debt test: A owes B \$20, B owes C \$20, C owes A \$20 simplifies to exactly \$0 net for all three.

---

### Task C: PayPal Orders API & Two-Step Capture Flow (Must-Have, Payment Backbone)

**What it is:** Generates real PayPal sandbox checkout links and **guarantees payment capture**.

> [!IMPORTANT]
> **The PayPal Capture Rule:** When creating an order with `intent: "CAPTURE"`, buyer approval alone does **not** transfer money. The application backend **must** execute `POST /v2/checkout/orders/{id}/capture` to complete the transaction and release funds.

**Technical build:**
1. **Order Creation:** `POST /v2/checkout/orders`
   - Use `payment_source.paypal.experience_context` (modern PayPal format) with `user_action: "PAY_NOW"`.
   - Embed custom tracking string in `purchase_units[0].custom_id`: `trip_id|debtor_user_id|expense_id`.
   - Parse the response for links where `rel == "approve"` OR `rel == "payer-action"`.
2. **Primary Capture Path (Redirect):**
   - The user finishes PayPal checkout and returns to `return_url`: `https://tripsheriff.onrender.com/api/payment/success?token={order_id}`.
   - The endpoint immediately executes `POST /v2/checkout/orders/{order_id}/capture`.
   - Marks the expense split as `SETTLED` in the ledger.
3. **Secondary Capture Path (Webhook Fallback):**
   - In case the user closes their browser before redirect completes, listen for webhook `CHECKOUT.ORDER.APPROVED` $\rightarrow$ server automatically triggers the capture call.
4. **Environment Time-Warp Setting:**
   - Include `DEMO_TIME_SCALE` (or command `/sim_time +24h`) so the agent's time-based logic can simulate 72 hours of debt age in 5 seconds during demo recording.

**Benchmark to pass:**
- Order creation returns a valid sandbox checkout URL in under 700ms.
- Executing payment in sandbox triggers immediate capture, updates ledger status, and returns a verified `COMPLETED` capture status.

---

### Task E: PayPal Webhook Ingestion & Event Dispatcher (Must-Have, Closed Loop)

**What it is:** Listens to incoming PayPal webhook notifications, validates signatures against PayPal's verification endpoint, and drives the real-time celebration feedback loop.

**Technical build:**
- Endpoint: `POST /api/paypal/webhook` (FastAPI).
- Signature Verification: Calls PayPal API `POST /v1/notifications/verify-webhook-signature` using incoming transmission headers (`paypal-transmission-id`, `paypal-transmission-time`, `paypal-transmission-sig`, `paypal-cert-url`, `paypal-auth-algo`) and registered `PAYPAL_WEBHOOK_ID`.
- Event Handlers:
  - `PAYMENT.CAPTURE.COMPLETED`: Decodes `custom_id` $\rightarrow$ marks ledger debt as `SETTLED` $\rightarrow$ resets user's Debt Heat Score to 0 $\rightarrow$ dispatches celebratory message with celebration GIF/emoji to the group chat and web dashboard.
  - `CHECKOUT.ORDER.APPROVED`: Automatically triggers capture if redirect capture hasn't completed.
  - `PAYOUTSBATCH.SUCCESS`: Dispatches notification that group trip reimbursements have successfully landed in members' accounts.

**Benchmark to pass:**
- Webhook signature verification passes with valid PayPal test headers.
- Telegram message and Web Dashboard row flash green within 2 seconds of payment capture.

---

### Task F: Agentic Tool-Calling Loop & Consensual Escalation Matrix (Centerpiece Feature)

**What it is:** An autonomous AI coordinator that reasons over the trip ledger, evaluates debt age, selects the appropriate action using real tool calling, and generates tone-calibrated debt collection messages.

**The Tool-Calling Architecture:**
The agent runs an autonomous loop over a suite of declared tools:
- `query_ledger_balances(trip_id)`: Inspects who owes what.
- `create_paypal_order(trip_id, debtor_id, amount_cents)`: Creates PayPal Orders link.
- `escalate_debtor_status(debtor_id, current_tier, hours_overdue)`: Evaluates escalation policy.
- `propose_batch_payout(trip_id)`: Generates settlement payout preview for organizer confirmation.

**The 5 Consensual Escalation Tiers:**
To prevent harassment and eliminate judge concerns, **every member selects their Roast Consent level on joining (`MILD`, `SPICY`, or `NO_ROAST`)**:

| Tier | Window | Persona / Voice | Sample Generated Output |
|---|---|---|---|
| **1** | 0–12h | Polite Concierge | *"Hey Alex! Quick link for your $80 villa split 🏖️ Hope you're enjoying the trip!"* |
| **2** | 12–24h | Passive-Aggressive Roommate | *"Must be nice watching the sunset from the terrace while Sarah fronts your bed... 👀"* |
| **3** | 24–48h | Disappointed Parent | *"Alex beta, I am not angry, just hurt. Is this how we raised you? Leaving Sarah to carry your hotel costs?"* |
| **4** | 48–72h | Public Roast Mode | Generates a custom meme card in chat: *"WANTED: Alex | Bounty: $80 | Crime: Ordering wagyu on someone else's card."* |
| **5** | >72h | Itinerary Embargo | Applies in-chat social sanction: *"Trip sanction applied: Alex has been demoted to sleeping on the pull-out couch until the $80 clears."* |

**Rate Limits & Safety Rules:**
- Max 1 automated prompt per 12 hours. Maximum 4 total automated messages; Tier 5 is a single status update in chat, not repeated pings.
- Any participant can type `/pause` or `/dispute` to instantly freeze all automated prompts.

**Benchmark to pass:**
- Tool-calling agent correctly selects `escalate_debtor_status` when simulated time passes 24 hours.
- Strict comedic safety guardrails: zero profanity, zero real threats, 100% playful social comedy.

---

### Task A: Dual Gateway — Telegram Bot + Hosted Judge Web Simulator (Must-Have, Accessibility)

**What it is:** Ensures both the viral chat experience AND an instant, zero-friction testing experience for hackathon judges who cannot configure a Telegram bot.

**1. The Telegram Bot:**
- Framework: `python-telegram-bot` (v20+ async).
- **Critical Telegram Configurations:**
  - **BotFather Privacy Mode:** Must run `/setprivacy` $\rightarrow$ `Disable` in BotFather so the bot can read natural language group messages ("Paid $60 for gas split with Alex").
  - **1:1 Deep-Link Onboarding:** Telegram bots cannot DM users first. When joining, the bot provides a deep link: `t.me/TripSheriffBot?start=join_trip_bali`. The user taps it to open a private DM where they submit their PayPal sandbox email and select their Roast Consent (`MILD`/`SPICY`).

**2. The Hosted Judge Web Simulator (Crucial for Evaluation):**
- A split-screen browser portal:
  - **Left Pane:** A realistic, interactive web-based chat interface simulating group members (Sarah, Alex, Dave).
  - **Right Pane:** The live trip ledger, Debt Heat Scores, and PayPal transaction log.
- Judges can click:
  - `[Simulate Expense: $150 Dinner]`
  - `[Simulate Time +24h]` (triggers Tier 3 Disappointed Parent message instantly)
  - `[Test PayPal Checkout]` (opens sandbox checkout)
  - `[Trigger Settlement Payout]`
- Eliminates 100% of judge setup friction.

**Benchmark to pass:**
- Both Telegram and Web Simulator speak to the exact same backend ledger and database.
- A judge can complete a full split $\rightarrow$ remind $\rightarrow$ pay $\rightarrow$ settle loop in the browser in under 60 seconds.

---

### Task D: PayPal Batch Payouts API & Settlement Engine (Must-Have, Financial Depth)

**What it is:** Settles net debts at trip conclusion by reimbursing organizers or members via **PayPal Batch Payouts API**.

**Technical build:**
- Endpoint: `POST /v1/payments/payouts`
- Headers: `PayPal-Request-Id: {idempotency_uuid}` (strictly prevents double-payouts on retries).
- Body: `sender_batch_header` + array of `items` containing `receiver` (email), `amount`, and `note`.
- **Human-in-the-Loop Confirmation:** The bot **never** disburses funds without explicit organizer approval:
  - In Telegram: Bot posts summary table with inline button: `[✅ Confirm Payout of $160.00 to Sarah]`.
  - In Web Dashboard: An explicit confirmation modal.

**Benchmark to pass:**
- Successfully initiates a batch payout to at least 2 distinct sandbox email accounts in one request.
- Idempotency key prevents duplicate execution on repeated clicks.

---

### Task G: Multimodal Receipt OCR & Interactive Itemizer (High Priority, AI Differentiator)

**What it is:** Snap a photo of a restaurant receipt and drop it into chat or the web simulator. AI extracts the merchant, items, prices, tax, and tip, and generates interactive claim buttons.

**Technical build:**
- Vision Model: Gemini 2.0 Flash (`gemini-2.0-flash` or `gemini-1.5-flash-latest`) via structured JSON schema:
  ```json
  {
    "merchant": "Sunset Bistro",
    "subtotal_cents": 12000,
    "tax_cents": 1000,
    "tip_cents": 2000,
    "total_cents": 15000,
    "items": [
      {"name": "Steak", "qty": 1, "price_cents": 4000},
      {"name": "Pasta", "qty": 2, "price_cents": 4000},
      {"name": "Cocktails", "qty": 3, "price_cents": 4000}
    ]
  }
  ```
- Proportional Tax & Tip Allocation: Automatically distributes tax and tip proportionately across claimed items so alcohol consumers pay their fair share of gratuity.
- Interactive UX: Inline buttons allow members to tap items to claim them, then click `[Done / Split Remaining]`.

**Benchmark to pass:**
- Successfully extracts line items from a sample receipt image with total cents balancing within 1 cent.

---

### Task I: Trip Organizer Dashboard with AG Grid (High Priority, Sponsor Prize)

**What it is:** An interactive web portal for trip organizers featuring an **AG Grid Enterprise/Community table**, proving commercial UI readiness and qualifying for the **AG Grid Sponsor Prize**.

**Technical build:**
- Frontend: React / Vite + Tailwind CSS.
- **AG Grid Integration:**
  - Columns: Date, Category Icon, Description, Amount, Paid By, Split Details, Payment Status Badge (`Paid`, `Pending`, `Escalated`).
  - Interactive Features: Sorting, Quick Filter, Category Grouping, Custom Status Cell Renderers.
- Real-time updates: WebSocket connection to FastAPI backend; rows highlight and update live when PayPal webhooks fire.

**Benchmark to pass:**
- AG Grid renders seamlessly with smooth sorting/filtering and updates via WebSocket without page refresh.

---

### Task K: Cloud Infrastructure on Render with Keep-Alive (Must-Have, Deployment)

**What it is:** Containerized cloud deployment on Render for public accessibility and submission requirements.

> [!WARNING]
> **Render Cold-Start / Free Tier Webhook Trap:** Render free services spin down after 15 minutes of inactivity, causing incoming PayPal webhooks to fail or time out.
> **Fix:** Either deploy on Render Starter (\$7/mo) OR implement a lightweight internal keep-alive cron job (e.g. UptimeRobot or scheduled worker pinging `/api/health` every 9 minutes) to guarantee zero webhook drops.

**Technical build:**
- `render.yaml` Blueprint configuring:
  - `web` service: FastAPI Uvicorn server.
  - `redis`: Render Key-Value store for task queuing.
- Environment variables configured for PayPal Sandbox credentials and AI API keys.
- Public URL registered in PayPal Developer Dashboard as the Webhook Listener.

**Benchmark to pass:**
- Public HTTPS endpoint returns `200 OK` on `/api/health`.
- PayPal Sandbox sends test webhooks with successful 200 responses logged on Render.

---

### Task L: Centerpiece Live Demo Script & 3-Minute Video Storyboard (Critical for "Best Demo Delivery")

**What it is:** The scene-by-scene rehearsal plan for the 3-minute Devpost demo video.

**Rules for Submission:** Strictly under 3:00 minutes. No copyrighted music. No unauthorized third-party trademark logos in thumbnail.

| Timestamp | Visual on Screen | Audio / Narration | Hackathon Goal |
|---|---|---|---|
| **0:00 - 0:25** | Split screen: Beach selfie vs. stressed organizer looking at a messy spreadsheet. | *"Group trips are unforgettable... until someone has to collect the money. Meet Alex. He's relaxing in Bali, but he's 'forgotten' his $80 villa deposit for 2 days."* | Hook: Universal relatable pain point. |
| **0:25 - 0:55** | Telegram chat: Organizer drops receipt photo $\rightarrow$ OCR extracts items $\rightarrow$ Bot generates 1-click PayPal checkout button. | *"Meet TripSheriff AI. You drop a receipt in chat. Multimodal AI itemizes the bill and spins up instant PayPal Orders links."* | Shows Multimodal AI + PayPal Orders API. |
| **0:55 - 1:40** | Fast-forward using `/sim_time +24h`. Watch the bot escalate: Polite $\rightarrow$ Disappointed Parent $\rightarrow$ Public Roast Card. | *"Alex ignores the polite prompt. So TripSheriff activates the Escalation Matrix. Level 3: Disappointed Parent. 'Alex beta, is this how we raised you?' And when he still drags his feet: The Public Deadbeat Roast Card."* | **Viral Demo Hook.** Unforgettable humor that judges remember. |
| **1:40 - 2:10** | Alex clicks "Pay via PayPal" on his phone. Completes sandbox checkout. Telegram celebrates; AG Grid updates live. | *"Defeated by guilt, Alex taps Pay. Behind the scenes, our server captures the PayPal order. Webhooks fire in 500ms, TripSheriff clears his debt, and AG Grid flashes green."* | Shows PayPal Orders Capture + Webhooks + AG Grid. |
| **2:10 - 2:40** | Organizer types `/settle`. Bot aggregates balances and dispatches Batch Payouts to 2 members. | *"Trip ends? One click triggers the PayPal Batch Payouts API. Everyone gets reimbursed in seconds on compliant PayPal rails."* | Shows PayPal Batch Payouts & Agentic Commerce. |
| **2:40 - 3:00** | Architectural diagram + GitHub repo link + Team sign-off. | *"Built with PayPal Developer Platform, Gemini, Render, and AG Grid. TripSheriff: Saving friendships, one debt at a time."* | Sponsor credit, clean finish. |

---

### Task M: Safety, Ethics & Consent Guardrails (Judicial Defense)

**What it is:** Explicit policies and code-level guardrails preventing harassment and protecting user privacy.

**Technical build:**
- **Explicit Consent:** Every member opts in upon joining (`/join` $\rightarrow$ select `MILD`, `SPICY`, or `NO_ROAST`).
- **Instant Opt-Out:** Typing `/pause`, `/optout`, or `/dispute` freezes all automated reminders immediately.
- **Content Filter:** All generated messages pass through a strict regex + safety filter banning profanity, slurs, threats, or genuine harassment.
- **Sandbox Safeguard:** Demo operates strictly on PayPal Developer Sandbox with test funds.

---

## 5. Scope Pruning & Timeline to Nov 12

With approximately 16 days to the deadline (November 12 at 12:00 PM PST / Nov 13 at 1:30 AM IST), execution is strictly prioritized:

```
┌────────────────────────────────────────────────────────────────────────┐
│ MUST BUILD (Days 1–8):                                                 │
│ • Task B: Double-entry integer-cent ledger & simplification             │
│ • Task C: PayPal Orders API + redirect & webhook capture               │
│ • Task E: PayPal Webhook verification & celebration engine             │
│ • Task F: Agentic tool-calling loop & 5-tier escalation matrix         │
│ • Task A: Telegram Bot + Hosted Judge Web Simulator                    │
│ • Task D: PayPal Batch Payouts with organizer confirmation             │
├────────────────────────────────────────────────────────────────────────┤
│ SHOULD BUILD (Days 9–13):                                              │
│ • Task G: Receipt photo OCR itemizer (Gemini Vision)                   │
│ • Task I: AG Grid Organizer Dashboard (for AG Grid Sponsor Prize)      │
│ • Task K: Render deployment with keep-alive                            │
├────────────────────────────────────────────────────────────────────────┤
│ DEFERRED / CUT (Out of scope for hackathon):                          │
│ ❌ Voice notes transcription (cool, but low judging delta vs OCR)       │
│ ❌ Standalone Invoicing API (redundant with Orders + Payouts)          │
│ ❌ Complex external vendor booking (replaced by in-app target tracker)│
├────────────────────────────────────────────────────────────────────────┤
│ BUFFER & SUBMISSION (Days 14–16):                                      │
│ • Full dry run on live Render environment                              │
│ • Record and edit 3-minute video (strict storyboard)                   │
│ • Devpost submission finalized 24 hours ahead of deadline              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. The Claims Ledger

Every line spoken in the demo video or written on Devpost must adhere to these three tiers:

### Safe to Say Without Further Measurement:
- "TripSheriff orchestrates group expenses using the PayPal Developer Platform (Orders API for inbound checkout, Batch Payouts API for outbound settlement)."
- "All monetary storage is calculated in integer cents with bipartite minimum-cash-flow debt simplification."
- "The agent enforces settlement through an opt-in, consensual escalating psychological matrix."
- "A web-based simulator is provided so judges can evaluate the entire agentic loop without configuring Telegram."

### Allowed Only After Verification on Deployed Instance:
- "End-to-end webhook reaction latency is under [X] seconds."
- "Batch Payout successfully reimbursed [N] members in a single API call."
- "Receipt OCR accurately parsed line items with 100% mathematical balance."

### Never Claim, Regardless of How the Demo Goes:
- Never claim: "TripSheriff is a licensed non-custodial escrow bank." (Acknowledge that this prototype uses a platform sandbox pooling model).
- Never claim: "Telegram has biometric authentication." (Say: "1-click confirmation button in chat").
- Never claim: "100% autonomous money transfers without human consent." (Always emphasize the Human-in-the-Loop organizer authorization).
- Never claim: "Eliminates all group debt forever." (State: "Removes social awkwardness and friction from collection").

---

## 7. Quick Reference: Tech Stack & Sandbox Configuration

### Tech Stack:
- **Backend:** Python 3.11+, FastAPI, `python-telegram-bot` (v20+ async), SQLAlchemy 2.0
- **AI Models:** Google Gemini 2.0 Flash (`gemini-2.0-flash` or `gemini-1.5-flash-latest`), OpenAI `gpt-4o-mini`
- **Frontend / Dashboard:** React / Vite, Tailwind CSS, AG Grid Community
- **Hosting:** Render Web Service + Managed Redis (with keep-alive worker)

### PayPal Developer Sandbox APIs:
- **Orders API (v2):** `POST /v2/checkout/orders`, `POST /v2/checkout/orders/{id}/capture`
- **Batch Payouts API (v1):** `POST /v1/payments/payouts`
- **Webhooks API:** `POST /v1/notifications/webhooks`, `POST /v1/notifications/verify-webhook-signature`

### Required Environment Variables (`.env.example`):
```env
# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_registered_webhook_id

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_botfather_token

# AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL_NAME=gemini-2.0-flash

# App & Environment
BASE_URL=https://tripsheriff.onrender.com
DATABASE_URL=sqlite:///./tripsheriff.db
SECRET_KEY=super_secure_random_key_here
DEMO_TIME_SCALE=1
```
