# TripSheriff AI — Backend API Testing Handbook

This handbook provides ready-to-use `curl` commands, JSON payloads, and expected responses to test all Task B features (Trips, Members, Expenses, Ledger Math, and Debt Simplification).

---

## 1. Quick Info & Base URL

* **Base URL**: `http://localhost:8080`
* **Swagger UI (Interactive API Tester)**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
* **OpenAPI v3 JSON Spec**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
* **H2 Console**: `http://localhost:8080/h2-console`
  * JDBC URL: `jdbc:h2:mem:tripsheriff`
  * User: `sa` | Password: *(empty)*

---

## 2. Step-by-Step Happy Path Walkthrough (Contract 1 Scenario)

### Step 1: Create a Trip
Creates a trip with a designated ID and currency.

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "trip_bali_2026",
    "name": "Bali Summer Vacation 2026",
    "currency": "USD"
  }'
```

**Expected Response (`201 Created`):**
```json
{
  "name": "Bali Summer Vacation 2026",
  "currency": "USD",
  "status": "ACTIVE",
  "trip_id": "trip_bali_2026",
  "created_at": "2026-10-29T13:18:00.000000Z"
}
```

---

### Step 2: Register Trip Members
Add Sarah (Organizer), Alex (Member), and Dave (Member).

**Sarah (Organizer, Roast: SPICY):**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/members \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_01",
    "name": "Sarah",
    "handle": "@sarah_c",
    "paypal_email": "sarah.organizer@personal.example.com",
    "role": "ORGANIZER",
    "roast_consent": "SPICY"
  }'
```

**Alex (Member, Roast: SPICY):**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/members \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_02",
    "name": "Alex",
    "handle": "@alex_travels",
    "paypal_email": "alex.debtor@personal.example.com",
    "role": "MEMBER",
    "roast_consent": "SPICY"
  }'
```

**Dave (Member, Roast: MILD):**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/members \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_03",
    "name": "Dave",
    "handle": "@dave_k",
    "paypal_email": "dave.payer@personal.example.com",
    "role": "MEMBER",
    "roast_consent": "MILD"
  }'
```

**Verify Members:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/members
```

---

### Step 3: Log an Equal Split Expense (Villa Deposit)
Sarah fronts **$240.00** (`24000` cents) for the "Sunset Villa Deposit", split equally across all 3 members ($80.00 each).

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "expense_id": "exp_8821",
    "paid_by": "user_01",
    "amount_cents": 24000,
    "description": "Sunset Villa Deposit",
    "category": "LODGING",
    "split_type": "EQUAL"
  }'
```

**Expected Response (`201 Created`):**
```json
{
  "description": "Sunset Villa Deposit",
  "category": "LODGING",
  "timestamp": "2026-10-29T13:20:00.000000Z",
  "splits": [
    {
      "user_id": "user_01",
      "owes_cents": 8000,
      "paid_status": "SETTLED"
    },
    {
      "user_id": "user_02",
      "owes_cents": 8000,
      "paid_status": "PENDING"
    },
    {
      "user_id": "user_03",
      "owes_cents": 8000,
      "paid_status": "PENDING"
    }
  ],
  "expense_id": "exp_8821",
  "paid_by": "user_01",
  "amount_cents": 24000,
  "split_type": "EQUAL"
}
```

---

### Step 4: Inspect the Master Trip Ledger (Contract 1 Compliant)
Fetch the double-entry ledger. Notice how `net_balances_cents` and `simplified_settlements` match **Contract 1** (`contracts/ledger.json`) down to the exact cent.

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/ledger
```

**Expected Response (`200 OK`):**
```json
{
  "currency": "USD",
  "members": [
    {
      "name": "Sarah",
      "handle": "@sarah_c",
      "role": "organizer",
      "user_id": "user_01",
      "paypal_email": "sarah.organizer@personal.example.com",
      "roast_consent": "SPICY"
    },
    {
      "name": "Alex",
      "handle": "@alex_travels",
      "role": "member",
      "user_id": "user_02",
      "paypal_email": "alex.debtor@personal.example.com",
      "roast_consent": "SPICY"
    },
    {
      "name": "Dave",
      "handle": "@dave_k",
      "role": "member",
      "user_id": "user_03",
      "paypal_email": "dave.payer@personal.example.com",
      "roast_consent": "MILD"
    }
  ],
  "expenses": [
    {
      "description": "Sunset Villa Deposit",
      "category": "LODGING",
      "timestamp": "2026-10-29T13:20:00Z",
      "splits": [
        {"user_id": "user_01", "owes_cents": 8000, "paid_status": "SETTLED"},
        {"user_id": "user_02", "owes_cents": 8000, "paid_status": "PENDING"},
        {"user_id": "user_03", "owes_cents": 8000, "paid_status": "PENDING"}
      ],
      "expense_id": "exp_8821",
      "paid_by": "user_01",
      "amount_cents": 24000,
      "split_type": "EQUAL"
    }
  ],
  "trip_id": "trip_bali_2026",
  "net_balances_cents": {
    "user_01": 16000,
    "user_02": -8000,
    "user_03": -8000
  },
  "platform_escrow_cents": 0,
  "simplified_settlements": [
    {
      "from_user_id": "user_02",
      "to_user_id": "user_01",
      "amount_cents": 8000,
      "formatted_amount": "80.00"
    },
    {
      "from_user_id": "user_03",
      "to_user_id": "user_01",
      "amount_cents": 8000,
      "formatted_amount": "80.00"
    }
  ]
}
```

---

### Step 5: View Simplified Settlement Graph Directly

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/settlements
```

**Expected Response (`200 OK`):**
```json
[
  {
    "from_user_id": "user_02",
    "to_user_id": "user_01",
    "amount_cents": 8000,
    "formatted_amount": "80.00"
  },
  {
    "from_user_id": "user_03",
    "to_user_id": "user_01",
    "amount_cents": 8000,
    "formatted_amount": "80.00"
  }
]
```

---

## 3. Advanced Split Types

### Exact Split (Custom Amounts per Person)
Alex pays **$150.00** (`15000` cents) for groceries with custom splits:
- Alex (`user_02`): $50.00 (`5000` cents)
- Sarah (`user_01`): $60.00 (`6000` cents)
- Dave (`user_03`): $40.00 (`4000` cents)

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "paid_by": "user_02",
    "amount_cents": 15000,
    "description": "Supermarket Groceries",
    "category": "FOOD",
    "split_type": "EXACT",
    "custom_splits": [
      {"user_id": "user_02", "owes_cents": 5000},
      {"user_id": "user_01", "owes_cents": 6000},
      {"user_id": "user_03", "owes_cents": 4000}
    ]
  }'
```

---

### Itemized Split (Receipt Items + Proportional Tax & Tip)
Sarah fronts **$156.00** (`15600` cents) for a bistro dinner with itemized items:
- Steak ($45.00) $\to$ Sarah
- Truffle Fries ($25.00) $\to$ Alex, Dave ($12.50 each)
- Cocktails ($50.00) $\to$ Sarah, Alex ($25.00 each)
- Subtotal: $120.00 (`12000` cents)
- Tax: $12.00 (`1200` cents)
- Tip: $24.00 (`2400` cents)
- Total: $156.00 (`15600` cents)

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "paid_by": "user_01",
    "amount_cents": 15600,
    "description": "Sunset Beach Bistro",
    "category": "FOOD",
    "split_type": "ITEMIZED",
    "tax_cents": 1200,
    "tip_cents": 2400,
    "items": [
      {"name": "Grilled Red Snapper", "price_cents": 4500, "claimed_by_user_ids": ["user_01"]},
      {"name": "Truffle Fries", "price_cents": 2500, "claimed_by_user_ids": ["user_02", "user_03"]},
      {"name": "Tropical Cocktails", "price_cents": 5000, "claimed_by_user_ids": ["user_01", "user_02"]}
    ]
  }'
```

---

## 4. Circular Debt Benchmark Test

Create a new trip to test automatic circular debt elimination:
1. **Trip**: `trip_circular` with members `A`, `B`, `C`.
2. **Expense 1**: `A` pays $20 for `B`. (A: +$20, B: -$20)
3. **Expense 2**: `B` pays $20 for `C`. (B: +$20, C: -$20)
4. **Expense 3**: `C` pays $20 for `A`. (C: +$20, A: -$20)

**Execute:**
```bash
# 1. Create Trip
curl -X POST http://localhost:8080/api/trips \
  -H "Content-Type: application/json" \
  -d '{"trip_id": "trip_circular", "name": "Circular Test"}'

# 2. Add Members
curl -X POST http://localhost:8080/api/trips/trip_circular/members -H "Content-Type: application/json" -d '{"user_id": "A", "name": "Alice"}'
curl -X POST http://localhost:8080/api/trips/trip_circular/members -H "Content-Type: application/json" -d '{"user_id": "B", "name": "Bob"}'
curl -X POST http://localhost:8080/api/trips/trip_circular/members -H "Content-Type: application/json" -d '{"user_id": "C", "name": "Charlie"}'

# 3. Add Expenses
curl -X POST http://localhost:8080/api/trips/trip_circular/expenses -H "Content-Type: application/json" \
  -d '{"paid_by": "A", "amount_cents": 2000, "description": "A paid for B", "split_type": "EQUAL", "split_with_user_ids": ["B"]}'

curl -X POST http://localhost:8080/api/trips/trip_circular/expenses -H "Content-Type: application/json" \
  -d '{"paid_by": "B", "amount_cents": 2000, "description": "B paid for C", "split_type": "EQUAL", "split_with_user_ids": ["C"]}'

curl -X POST http://localhost:8080/api/trips/trip_circular/expenses -H "Content-Type: application/json" \
  -d '{"paid_by": "C", "amount_cents": 2000, "description": "C paid for A", "split_type": "EQUAL", "split_with_user_ids": ["A"]}'

# 4. View Settlements
curl -X GET http://localhost:8080/api/trips/trip_circular/settlements
```

**Expected Result:**
```json
[]
```
The algorithm simplifies all 3 circular debts to **0 transactions** because everyone's net balance is $0.00!

---

## 5. Error Handling & Validation Tests

### Test: Exact Split Sum Mismatch
Submit an exact split where splits sum to 16,000 cents but total amount is 24,000 cents.

**Request:**
```bash
curl -i -X POST http://localhost:8080/api/trips/trip_bali_2026/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "paid_by": "user_01",
    "amount_cents": 24000,
    "description": "Mismatch Test",
    "split_type": "EXACT",
    "custom_splits": [
      {"user_id": "user_01", "owes_cents": 8000},
      {"user_id": "user_02", "owes_cents": 8000}
    ]
  }'
```

**Expected Response (`400 Bad Request`):**
```json
{
  "timestamp": "2026-10-29T13:25:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Exact split total (16000 cents) does not match expense amount (24000 cents). Difference: 8000 cents"
}
```

---

## 6. PayPal Orders API & Two-Step Capture Flow (Task C)

### Step 1: Create a PayPal Checkout Order for a Debtor Split
Creates an approved PayPal order token for Alex (`user_02`) on the Villa Deposit (`exp_8821`).

**Request:**
```bash
curl -X POST http://localhost:8080/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "trip_bali_2026",
    "debtor_id": "user_02",
    "expense_id": "exp_8821"
  }'
```

**Expected Response (`201 Created`):**
```json
{
  "order_id": "5O190127TN364715T",
  "approve_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  "status": "CREATED",
  "custom_id": "trip_bali_2026|user_02|exp_8821",
  "amount_cents": 8000,
  "formatted_amount": "80.00"
}
```
*(Notice: The `ExpenseSplit` in the trip database is automatically linked with `paypal_order_id` and `payment_url`)*.

---

### Step 2: Primary Capture Path — Buyer Approval Redirect
When the buyer completes approval in PayPal Sandbox, PayPal redirects their browser back to `return_url`: `http://localhost:8080/api/payment/success?token=5O190127TN364715T`.

**Test in Browser or with curl:**
```bash
# Request celebratory HTML (default browser behavior):
curl -i "http://localhost:8080/api/payment/success?token=5O190127TN364715T"

# Or request JSON (for automated tests or frontend callers):
curl -i -H "Accept: application/json" "http://localhost:8080/api/payment/success?token=5O190127TN364715T"
```

**Expected Response (`200 OK` JSON):**
```json
{
  "order_id": "5O190127TN364715T",
  "capture_id": "CAP_703821932024",
  "status": "COMPLETED",
  "custom_id": "trip_bali_2026|user_02|exp_8821",
  "trip_id": null,
  "debtor_id": "user_02",
  "expense_id": "exp_8821",
  "amount_cents": 8000,
  "payer_email": "alex.debtor@personal.example.com",
  "settled_at": "2026-10-30T13:20:00Z"
}
```

---

### Step 3: Programmatic Direct Capture (Web Simulator & Webhook Fallback)
Direct endpoint allowing the judge web simulator to trigger capture instantly without waiting for redirects.

**Request:**
```bash
curl -X POST http://localhost:8080/api/payment/capture/5O190127TN364715T
```

**Expected Response (`200 OK`):**
```json
{
  "order_id": "5O190127TN364715T",
  "capture_id": "CAP_703821932024",
  "status": "COMPLETED",
  "custom_id": "trip_bali_2026|user_02|exp_8821",
  "debtor_id": "user_02",
  "expense_id": "exp_8821",
  "amount_cents": 8000
}
```

---

### Step 4: Verify Post-Capture Ledger State & Platform Escrow
Inspect the ledger after Alex's payment. Notice:
- Alex's net debt is `0` (`SETTLED`).
- Sarah's receivable is preserved at `+16000` (+8000 from Dave pending, +8000 from Escrow).
- `platform_escrow_cents` holds `8000` ready for Task D Batch Payout!

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/ledger
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "currency": "USD",
  "net_balances_cents": {
    "user_01": 16000,
    "user_02": 0,
    "user_03": -8000
  },
  "platform_escrow_cents": 8000,
  "simplified_settlements": [
    {
      "from_user_id": "user_03",
      "to_user_id": "user_01",
      "amount_cents": 8000,
      "formatted_amount": "80.00"
    }
  ]
}
```

---

### Step 5: Environment Time-Warp Simulator (Debt Aging)
Fast-forwards the virtual trip clock by +24 hours to simulate debt aging during demo recording.

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/sim-time \
  -H "Content-Type: application/json" \
  -d '{"hours_to_advance": 24}'
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "total_hours_advanced": 24,
  "effective_now": "2026-10-31T13:20:00Z",
  "message": "Fast-forwarded trip time by +24 hours. Total simulated advance: 24 hours."
}
```

---

## 7. PayPal Batch Payouts API Walkthrough (Task D)

Task D handles the conclusion of the trip, reimbursing multiple creditors (e.g. Sarah for Villa, Dave for Dinner) via the **PayPal Batch Payouts API** (`POST /v1/payments/payouts`) with mandatory Human-in-the-Loop approval and strict idempotency protection.

### Step 1: Human-in-the-Loop Proposal Preview
Before any money moves, the organizer requests a payout proposal. The system verifies positive balances, checks platform escrow, and formats Contract 3 line items.

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/payout/proposal
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "currency": "USD",
  "platform_escrow_cents": 16000,
  "formatted_platform_escrow": "160.00",
  "total_payout_cents": 16000,
  "formatted_total_payout": "160.00",
  "idempotency_key": "9d8e6a12-4c22-4a0b-9311-bf39110022fa",
  "requires_confirmation": true,
  "items": [
    {
      "user_id": "user_01",
      "member_name": "Sarah",
      "receiver_email": "sarah.organizer@personal.example.com",
      "amount_cents": 16000,
      "formatted_amount": "160.00",
      "currency": "USD",
      "note": "TripSheriff: Net reimbursement for Bali Summer Vacation 2026 (Sarah)",
      "sender_item_id": "settle_user_01_179342999"
    }
  ],
  "warning": null
}
```

---

### Step 2: Organizer Authorizes Batch Payout (Multi-Recipient Disbursement)
The organizer clicks **[Confirm Payout]** in the Telegram Bot or Web Simulator. The backend dispatches `POST /v1/payments/payouts` with the `PayPal-Request-Id: {idempotency_key}` header.

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/payout/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "9d8e6a12-4c22-4a0b-9311-bf39110022fa",
    "email_subject": "TripSheriff: Bali Trip Reimbursement Arrived!",
    "email_message": "All trip expenses are settled. Funds have been deposited to your PayPal account."
  }'
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "payout_batch_id": "5UE86K84MZN4E",
  "batch_status": "SUCCESS",
  "idempotency_key": "9d8e6a12-4c22-4a0b-9311-bf39110022fa",
  "total_disbursed_cents": 16000,
  "formatted_total_disbursed": "160.00",
  "currency": "USD",
  "items": [
    {
      "user_id": "user_01",
      "member_name": "Sarah",
      "receiver_email": "sarah.organizer@personal.example.com",
      "amount_cents": 16000,
      "formatted_amount": "160.00",
      "currency": "USD",
      "note": "TripSheriff: Net reimbursement for Bali Summer Vacation 2026 (Sarah)",
      "sender_item_id": "settle_user_01_179342999"
    }
  ],
  "settled_recipients_count": 1,
  "is_idempotent_replay": false,
  "executed_at": "2026-10-31T12:20:00Z",
  "message": "Batch payout executed successfully. Reimbursed 1 members (USD 160.00)"
}
```

---

### Step 3: Test Strict Idempotency Protection (Replay Attack / Double Clicks)
Re-submit the exact same `idempotency_key`. The service recognizes the key, prevents duplicate execution, and returns the previous result with `is_idempotent_replay: true`.

**Request:**
```bash
curl -X POST http://localhost:8080/api/trips/trip_bali_2026/payout/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "9d8e6a12-4c22-4a0b-9311-bf39110022fa"
  }'
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "payout_batch_id": "5UE86K84MZN4E",
  "batch_status": "SUCCESS",
  "idempotency_key": "9d8e6a12-4c22-4a0b-9311-bf39110022fa",
  "total_disbursed_cents": 16000,
  "formatted_total_disbursed": "160.00",
  "currency": "USD",
  "settled_recipients_count": 1,
  "is_idempotent_replay": true,
  "message": "Idempotent replay: batch payout was previously executed."
}
```

---

### Step 4: Verify Final Zero-Balance Ledger
Inspect the ledger after payout completion. Sarah's credit is now $0.00 and `platform_escrow_cents` is $0.00. The trip is 100% financially settled.

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/ledger
```

**Expected Response (`200 OK`):**
```json
{
  "trip_id": "trip_bali_2026",
  "currency": "USD",
  "net_balances_cents": {
    "user_01": 0,
    "user_02": 0,
    "user_03": 0
  },
  "platform_escrow_cents": 0,
  "simplified_settlements": []
}
```

---

### Step 5: Query PayPal Batch Status
Check real-time processing status of the payout batch directly from PayPal:

**Request:**
```bash
curl -X GET http://localhost:8080/api/trips/trip_bali_2026/payout/5UE86K84MZN4E
```

**Expected Response (`200 OK`):**
```json
{
  "payout_batch_id": "5UE86K84MZN4E",
  "batch_status": "SUCCESS",
  "sender_batch_id": "batch_payout_trip_bali_2026_179342999",
  "total_amount": "160.00",
  "currency": "USD",
  "created_at": "2026-10-31T12:20:00Z",
  "items_count": 1
}
```

---

## 8. PayPal Webhooks & Real-Time Event Dispatcher Walkthrough (Task E)

Task E listens to asynchronous PayPal webhook notifications, validates transmission signatures, settles ledger splits, and broadcasts real-time celebration events over Server-Sent Events (SSE).

### Step 1: Subscribe to Trip Real-Time Events (SSE)
Open a terminal to stream events in real time (or connect via Web EventSource):

**Request:**
```bash
curl -N -H "Accept: text/event-stream" http://localhost:8080/api/trips/trip_bali_2026/events
```

**Expected Initial Stream Output:**
```
event:CONNECTED
data:{"message":"Subscribed to trip events","trip_id":"trip_bali_2026"}
```

---

### Step 2: Ingest Valid `PAYMENT.CAPTURE.COMPLETED` Webhook
Simulates PayPal Sandbox firing the payment capture completed notification:

**Request:**
```bash
curl -X POST http://localhost:8080/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-id: tx_99182377" \
  -H "paypal-transmission-time: 2026-10-31T14:30:05Z" \
  -H "paypal-transmission-sig: VALID_MOCK_SIGNATURE" \
  -H "paypal-cert-url: https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -d '{
    "id": "WH-EVT-99881122",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "create_time": "2026-10-31T14:30:00Z",
    "resource": {
      "id": "CAP-MOCK-99112233",
      "custom_id": "trip_bali_2026|user_02|exp_8821",
      "status": "COMPLETED",
      "amount": {
        "value": "80.00",
        "currency_code": "USD"
      }
    }
  }'
```

**Expected Response (`200 OK`):**
```json
{
  "status": "SUCCESS",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "event_id": "WH-EVT-99881122",
  "message": "🎉 HALLELUJAH! Alex has settled $80.00 for Sunset Villa Deposit via PayPal!",
  "processed": true
}
```

**SSE Event Received in Terminal 1:**
```
event:PAYMENT.CAPTURE.COMPLETED
data:{"event_id":"WH-EVT-99881122","event_type":"PAYMENT.CAPTURE.COMPLETED","trip_id":"trip_bali_2026","debtor_id":"user_02","debtor_name":"Alex","amount_cents":8000,"formatted_amount":"80.00","currency":"USD","message":"🎉 HALLELUJAH! Alex has settled $80.00 for Sunset Villa Deposit via PayPal!","timestamp":"2026-10-31T14:30:06Z"}
```

---

### Step 3: Test Forged / Tampered Signature Rejection
Send a webhook with an invalid or tampered signature:

**Request:**
```bash
curl -X POST http://localhost:8080/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-id: tx_fake_01" \
  -H "paypal-transmission-time: 2026-10-31T14:35:00Z" \
  -H "paypal-transmission-sig: FORGED_TAMPERED_SIG" \
  -H "paypal-cert-url: https://fake.cert.url" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -d '{
    "id": "WH-EVT-FORGED",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": { "id": "CAP-FAKE" }
  }'
```

**Expected Response (`400 Bad Request`):**
```json
{
  "status": "REJECTED",
  "error": "Invalid PayPal transmission signature"
}
```

---

### Step 4: Fallback Capture on `CHECKOUT.ORDER.APPROVED`
If the buyer approved payment on PayPal but closed the browser before returning to the success redirect URL:

**Request:**
```bash
curl -X POST http://localhost:8080/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-sig: VALID_SIG" \
  -d '{
    "id": "WH-EVT-APPROVED-01",
    "event_type": "CHECKOUT.ORDER.APPROVED",
    "resource": {
      "id": "5O190127TN364715T"
    }
  }'
```

**Expected Response (`200 OK`):**
```json
{
  "status": "SUCCESS",
  "event_type": "CHECKOUT.ORDER.APPROVED",
  "event_id": "WH-EVT-APPROVED-01",
  "message": "Successfully triggered automatic capture for order 5O190127TN364715T",
  "processed": true
}
```

---

### Step 5: `PAYOUTSBATCH.SUCCESS` Disbursement Delivery Notice
Dispatches a group celebration that batch reimbursements have landed:

**Request:**
```bash
curl -X POST http://localhost:8080/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-sig: VALID_SIG" \
  -d '{
    "id": "WH-EVT-PAYOUT-01",
    "event_type": "PAYOUTSBATCH.SUCCESS",
    "resource": {
      "batch_header": {
        "payout_batch_id": "5UE86K84MZN4E",
        "amount": { "value": "160.00", "currency": "USD" },
        "sender_batch_header": { "sender_batch_id": "batch_payout_bali_01" }
      }
    }
  }'
```

**Expected Response (`200 OK`):**
```json
{
  "status": "SUCCESS",
  "event_type": "PAYOUTSBATCH.SUCCESS",
  "event_id": "WH-EVT-PAYOUT-01",
  "message": "💸 Batch Payout Delivered! Group trip reimbursements (USD 160.00) have successfully landed in members' PayPal accounts.",
  "processed": true
}
```



