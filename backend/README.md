# TripSheriff AI — Backend Core & Double-Entry Ledger Engine (Task B)

Welcome to the **TripSheriff AI** core Java backend service. This service acts as the financial fortress and source of truth for group travel treasury, expense splitting, double-entry ledger calculation, and multi-party debt simplification.

---

## 1. Architectural Overview

The backend is built with **Java 21** and **Spring Boot**, adhering to a clean **Package-by-Feature** architecture. Each feature is self-contained with its own models, repositories, services, controllers, and DTOs:

```
backend/src/main/java/com/shrihari/backend/
├── common/                  # Cross-cutting utilities, Jackson config, global exceptions
│   ├── CurrencyUtils.java   # Strict integer cent conversions & formatting
│   ├── IdGenerator.java     # Prefixed human-friendly ID generator (trip_*, exp_*, user_*)
│   ├── JacksonConfig.java   # Custom ObjectMapper with JSR-310 JavaTime support
│   └── exception/           # ResourceNotFoundException, InvalidSplitException, GlobalExceptionHandler
├── trip/                    # Feature: Trip lifecycle
│   ├── model/               # Trip.java, TripStatus.java
│   ├── repository/          # TripRepository.java
│   ├── service/             # TripService.java
│   ├── controller/          # TripController.java
│   └── dto/                 # TripCreateRequest.java, TripResponse.java
├── member/                  # Feature: Trip participants & roles
│   ├── model/               # TripMember.java, MemberRole.java, RoastConsent.java
│   ├── repository/          # TripMemberRepository.java
│   ├── service/             # TripMemberService.java
│   ├── controller/          # TripMemberController.java
│   └── dto/                 # MemberCreateRequest.java, MemberResponse.java
├── expense/                 # Feature: Multi-type expense logging
│   ├── model/               # Expense.java, ExpenseSplit.java, SplitType.java, PaymentStatus.java
│   ├── repository/          # ExpenseRepository.java, ExpenseSplitRepository.java
│   ├── service/             # ExpenseService.java, SplitCalculator.java
│   ├── controller/          # ExpenseController.java
│   └── dto/                 # ExpenseCreateRequest.java, ExpenseResponse.java, SplitResponse.java
├── ledger/                  # Feature: Core financial math & debt graph
│   ├── service/             # LedgerEngine.java, DebtSimplificationService.java
│   ├── controller/          # LedgerController.java
│   ├── model/               # Settlement.java, SettlementStatus.java
│   ├── repository/          # SettlementRepository.java
│   └── dto/                 # LedgerResponse.java, SettlementTransaction.java
├── payment/                 # Feature: PayPal Orders & Two-Step Capture (Task C)
│   ├── client/              # PayPalClient.java (OAuth2 token cache, Orders v2, Capture, Batch Payouts)
│   ├── config/              # PayPalProperties.java (Auto-Mock fallback & credentials binding)
│   ├── service/             # PaymentService.java (Orchestration, ExpenseSplit status updates)
│   ├── controller/          # PaymentController.java (/create-order, /success, /cancel, /capture)
│   └── dto/                 # CreateOrderRequest, CreateOrderResponse, CaptureOrderResponse
└── payout/                  # Feature: PayPal Batch Payouts & Settlement Engine (Task D)
    ├── service/             # PayoutService.java (Proposal, idempotency validation, batch execution)
    ├── controller/          # PayoutController.java (/proposal, /confirm, /{batchId})
    └── dto/                 # PayoutBatchItemDto, PayoutProposalResponse, PayoutConfirmRequest, etc.
```

---

## 2. Core Mathematical Specifications (Task B)

### A. Strict Integer Cents Precision
Floating-point arithmetic (`float` / `double`) causes rounding drift in financial transactions. TripSheriff stores and calculates all values in **integer cents** (`long amountCents`).
- Example: `$80.00` is represented as `8000L`.
- String representations (e.g. `"80.00"`) are generated only at presentation / API boundaries via `CurrencyUtils.centsToFormattedString()`.

### B. Deterministic Remainder Cent Distribution
When an amount cannot be divided evenly among $N$ people (e.g. $100.00 split 3 ways):
- Base share: `base = totalCents / N = 3333` cents ($33.33).
- Remainder: `rem = totalCents % N = 1` cent.
- The remainder is assigned deterministically to the first `rem` members:
  - User 1: `3334` cents ($33.34)
  - User 2: `3333` cents ($33.33)
  - User 3: `3333` cents ($33.33)
  - **Sum**: Exactly `10000` cents ($100.00). **Zero floating-point drift.**

### C. Supported Split Types
1. **`EQUAL`**: Splits expense equally across selected members (or all members of the trip if omitted), with remainder distribution.
2. **`EXACT`**: Custom dollar/cent allocation per member. Strict validation guarantees that $\sum \text{customCents} == \text{totalCents}$.
3. **`ITEMIZED`**: Line-item claims with proportional tax and tip distribution.
   - **OCR Drift Auto-Absorption Tolerance**: Real-world receipt line items and sales tax rounding frequently cause ±1–2 cents of rounding variance. `SplitCalculator` automatically absorbs up to $\pm 2$ cents of OCR rounding drift, preserving strict integer cent balancing without brittle request rejections.

### D. Bipartite Minimum Cash Flow Debt Simplification
In a group of $N$ people, naive debt tracking creates $O(N^2)$ transactions with confusing circular debts (e.g. $A \to B \ \$20$, $B \to C \ \$20$, $C \to A \ \$20$).

**The Algorithm (`DebtSimplificationService.java`):**
1. Computes the net balance of every participant:
   $$\text{netBalance}(U) = \sum \text{Fronted} - \sum \text{Owed}$$
2. Members with $\text{netBalance} == 0$ (including full circular debt loops) are eliminated immediately.
3. Separates non-zero members into two Max-Heaps:
   - **Creditors Heap** ($\text{netBalance} > 0$): sorted descending by amount owed to them.
   - **Debtors Heap** ($\text{netBalance} < 0$): sorted descending by amount they owe.
4. Greedily pairs the maximum debtor $D$ with the maximum creditor $C$:
   $$\text{settlement} = \min(|B_D|, B_C)$$
   Emits a direct transaction $D \to C$ and pushes any remaining balance back into the respective heap.
5. **Guarantees**:
   - Reduces $O(N^2)$ debts down to at most $N - 1$ settlement transactions.
   - Circular debts reduce to **exactly 0 transactions**.
   - Exactly matches Contract 1 schema (`contracts/ledger.json`).

### E. Platform Escrow vs. Direct Settlement Architecture
In TripSheriff's platform-mediated architecture:
- When Alex pays his $80 split via the PayPal Orders API (Task C), the funds flow into the **TripSheriff Platform Sandbox Escrow Account**.
- Alex's debt is cleared immediately (`Alex net balance = 0`).
- The funds are credited to `platform_escrow_cents` (+8000), while Sarah's receivable credit is **preserved**.
- When the trip concludes and the organizer authorizes Task D (PayPal Batch Payouts), the platform disburses the pooled funds to Sarah, satisfying both Sarah's credit and the escrow balance simultaneously.

---

## 3. PayPal Orders API & Two-Step Capture Flow (Task C)

TripSheriff implements the complete PayPal Orders v2 payment lifecycle for individual debt collection.

### A. The PayPal Capture Rule
When creating an order with `intent: "CAPTURE"`, buyer approval alone does **not** transfer money. The application backend **must** execute `POST /v2/checkout/orders/{id}/capture` to complete the transaction and release funds into escrow.

### B. Order Creation (`POST /api/payment/create-order`)
- Adheres to **Contract 3 (`contracts/paypal_ops.json`)**.
- Uses modern PayPal `payment_source.paypal.experience_context` with `user_action: "PAY_NOW"`.
- Encodes custom tracking metadata in `purchase_units[0].custom_id`: `trip_id|debtor_user_id|expense_id`.
- Automatically links `paypal_order_id` and the PayPal sandbox approval URL directly to the debtor's `ExpenseSplit` in the database.

### C. Two-Step Capture Paths
1. **Primary Path (Buyer Redirect)**:
   - When buyer finishes checkout on PayPal, they return to:
     `GET /api/payment/success?token={orderId}`
   - The endpoint immediately executes `POST /v2/checkout/orders/{id}/capture`.
   - Transitions `ExpenseSplit.paidStatus` from `PENDING` to `SETTLED`.
   - Renders a clean, celebratory HTML confirmation page (or JSON response when queried by automated clients).
2. **Programmatic / Webhook Direct Path**:
   - `POST /api/payment/capture/{orderId}`: Enables direct server-to-server capture triggered by the Web Simulator or the `CHECKOUT.ORDER.APPROVED` webhook fallback.

### D. Zero-Config Auto-Mock Mode
- If `PAYPAL_CLIENT_ID` is empty (or `paypal.mock-mode=true`), the system automatically runs in Mock Mode.
- Generates realistic sandbox checkout links (`https://www.sandbox.paypal.com/checkoutnow?token=...`) and handles capture without failing or requiring internet access.
- As soon as real sandbox credentials are added to environment variables or `application.properties`, the system automatically switches to live sandbox calls with **zero code changes**.

### E. Environment Time-Warp Setting (`POST /api/trips/{tripId}/sim-time`)
- Allows organizers or judges to advance the virtual trip clock by +24h, +48h, or +72h in milliseconds.
- Enables simulating debt aging and triggering higher escalation tiers instantly during hackathon demo recording.

---

## 4. PayPal Batch Payouts API & Settlement Engine (Task D)

When a trip concludes, TripSheriff settles all accumulated group reimbursements via the **PayPal Batch Payouts API** (`POST /v1/payments/payouts`).

### A. Human-in-the-Loop Proposal (`GET /api/trips/{tripId}/payout/proposal`)
TripSheriff **never** disburses funds without explicit organizer approval:
- Inspects the current double-entry ledger to identify net creditors (`balance > 0`).
- Validates collected `platform_escrow_cents` vs total owed.
- Generates Contract 3 compliant line items mapped to each creditor's registered `paypal_email`.
- Generates a UUID `idempotency_key` pre-configured for the payout execution.
- Returns a proposal preview with `requires_confirmation = true`.

### B. Batch Execution (`POST /api/trips/{tripId}/payout/confirm`)
Organizer reviews and authorizes the disbursement:
- Transmits Contract 3 `batch_payout_payload` with `sender_batch_header` and multiple recipient `items`.
- Injects mandatory `PayPal-Request-Id: {idempotency_uuid}` HTTP header.
- Reimburses multiple participants (e.g. Sarah for Villa, Dave for Dinner) in a single atomic transaction.

### C. Strict Idempotency Protection
- If an organizer double-clicks or network retries occur, `PayoutService` checks for existing `Settlement` records with that `idempotency_key`.
- If already processed, it immediately returns the original response with `"is_idempotent_replay": true` and **zero duplicate PayPal API calls or ledger debits**.

### D. Closed-Loop Ledger Finality
Upon successful payout confirmation:
- Creates persistent `Settlement` records (`status = COMPLETED`, `fromUserId = "PLATFORM_ESCROW"`, `paypalPayoutBatchId`, `idempotencyKey`).
- `LedgerEngine` automatically updates:
  - Disbursed payouts debit each recipient's positive balance to zero.
  - Decrements `platform_escrow_cents` by the exact disbursement total.

### E. Batch Status Query (`GET /api/trips/{tripId}/payout/{batchId}`)
- Queries `GET /v1/payments/payouts/{batchId}` on PayPal Sandbox to verify real-time status and delivery confirmations.

---

## 5. Database Setup (H2 $\to$ PostgreSQL)

### Local Development (H2 In-Memory)
By default, the application runs with an embedded **H2 in-memory database** with PostgreSQL compatibility mode:
- **JDBC URL**: `jdbc:h2:mem:tripsheriff;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL`
- **H2 Web Console**: [http://localhost:8080/h2-console](http://localhost:8080/h2-console)
  - JDBC URL: `jdbc:h2:mem:tripsheriff`
  - User Name: `sa`
  - Password: *(blank)*

### Switching to PostgreSQL
When your PostgreSQL instance is ready, update `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/tripsheriff
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

---

## 4. Building and Running

### Prerequisites
- Java 21+ JDK
- Maven wrapper (`./mvnw`)

### Run Tests
```bash
./mvnw test
```
All unit and integration tests (including split remainder tests and circular debt benchmark) will execute against the in-memory H2 database.

### Start the Server
```bash
./mvnw spring-boot:run
```
The application will start on **`http://localhost:8080`**.

---

## 6. Interactive Swagger / OpenAPI Documentation

TripSheriff includes interactive Swagger UI documentation and OpenAPI 3.0 specification:
- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI v3 JSON Spec**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

The interactive dashboard categorizes endpoints across all core features:
- **Trips**: Trip lifecycle & time-warp debt age simulator (`/api/trips`, `/api/trips/{tripId}/sim-time`)
- **Members**: Participant registration, roles, and roast consent (`/api/trips/{tripId}/members`)
- **Expenses**: Equal remainder distribution, Exact splits, and Itemized splits with OCR drift tolerance (`/api/trips/{tripId}/expenses`)
- **Ledger**: Double-entry ledger math and Bipartite Minimum Cash Flow debt simplification graph (`/api/trips/{tripId}/ledger`, `/api/trips/{tripId}/settlements`)
- **Payments**: PayPal Orders v2 creation, redirect capture, and direct capture (`/api/payment/create-order`, `/api/payment/success`, `/api/payment/capture/{orderId}`)
- **Payouts**: PayPal Batch Payouts API proposal, multi-recipient disbursement, and idempotency protection (`/api/trips/{tripId}/payout/proposal`, `/api/trips/{tripId}/payout/confirm`)


---

## 5. Contract Compliance

The output of `GET /api/trips/{tripId}/ledger` adheres 100% to **Contract 1 (`contracts/ledger.json`)**:
- `trip_id`
- `currency`
- `members` (`user_id`, `name`, `handle`, `paypal_email`, `role`, `roast_consent`)
- `expenses` (`expense_id`, `paid_by`, `amount_cents`, `description`, `category`, `timestamp`, `split_type`, `splits`)
- `net_balances_cents` (Map of user IDs to integer net cents)
- `simplified_settlements` (Optimal $N-1$ transaction settlement plan)
