# TripSheriff AI — Backend API Testing Handbook

This handbook provides ready-to-use `curl` commands, JSON payloads, and expected responses to test all Task B features (Trips, Members, Expenses, Ledger Math, and Debt Simplification).

---

## 1. Quick Info & Base URL

* **Base URL**: `http://localhost:8080`
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

