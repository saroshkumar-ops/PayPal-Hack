# 🤠 TripSheriff AI — Frontend & Judge Web Simulator

> Built for the **PayPal AI Hackathon 2026** (Devpost)  
> Competing for: **1st Place Grand Prize**, **Best Use of Agentic Commerce**, and **AG Grid Sponsor Prize**.

---

## 🌟 Overview

**TripSheriff AI** solves the social debt friction of group travel through an autonomous double-entry treasury agent. The frontend delivers a unified, responsive interface designed for hackathon judges, trip organizers, and traveling friends:

1. **Trip Organizer Dashboard (Overview):**
   - Live double-entry integer-cent ledger with debt simplification ($O(N)$ minimum cash flow).
   - Dynamic Virtual Trip Card with real-time balance metrics and currency toggle (INR / USD).
   - Signature tactile paper receipt widget with live traveler split printing and member avatar chips.
   - Animated split separation moment: shares cleanly detach from the receipt and land on member avatars.

2. **Multimodal Receipt Drop & Custom Split Cockpit:**
   - Drag-and-drop receipt scanning modal with optical laser scan animation (respects `prefers-reduced-motion`).
   - Multi-tier multimodal vision OCR (Gemini 1.5 Flash Vision $\rightarrow$ Groq Llama 3.2 Vision $\rightarrow$ deterministic mock fallback).
   - Quantity, unit rate, and line total extraction (amounts computed as $\text{quantity} \times \text{rate}$).
   - Subtotal discrepancy detection with honest printed round-off handling.
   - Mismatch notice: alerts the user when line items differ from bill total by $> 100\text{ cents}$ or $1\%$, allowing full inline editing of bill total, item names, and prices.
   - Asymmetric Custom Split: Itemized member claims, communal sharing, proportional tax/tip/round-off distribution, and user-typed custom shares with zero-drift integer-cent balancing.

3. **Live Transaction Ledger & Inspection Modal (`/ledger`):**
   - AG Grid Dark Quartz data grid with sorting, filtering, and custom cell status renderers (`SETTLED`, `PENDING`).
   - Interactive transaction inspection modal: clicking any ledger row opens the stored receipt breakdown and claimant allocations.

4. **Hosted Judge Web Simulator (`/simulator`):**
   - Dual split-screen interface: left pane simulates natural chat conversation with autonomous AI intent parsing; right pane provides real-time AG Grid financial ledger synchronization.
   - Debt aging simulation with 4 escalation personality tiers (Gentle $\rightarrow$ Passive-Aggressive $\rightarrow$ Full Roast $\rightarrow$ Nuclear).

5. **PayPal Sandbox Payouts & Express Checkout (`/payouts`):**
   - PayPal Checkout Drawer with direct order link generation and copyable approval tokens.
   - Organizer Batch Payout Modal with idempotent payout execution for consolidated reimbursements.

6. **Authentication & Party Management (`/login`):**
   - Self-contained JWT authentication flow with registration, login, and quick demo credentials.
   - Custom party creation modal with instant friend onboarding.

---

## 🎨 Design System & Visual Tokens

The frontend implements a strict, cohesive design system with zero visual clutter:

* **Canvas:** `var(--canvas)` (`#07080D`) — Deep neutral dark canvas.
* **Surfaces:** `var(--surface)` (`#0F1117`), `var(--surface-elevated)` (`#171A23`) — Layered cards and modals.
* **Borders:** `var(--border)` (`rgba(255, 255, 255, 0.08)`) — Crisp, hair-line structural borders.
* **Typography:** `var(--text)` (`#EDEEF2`), `var(--muted)` (`#8A8FA3`) — High-contrast display and monospace figures.
* **Primary Role Accent (Lime):** `var(--settled)` (`#C6FF3D`) — Strictly reserved for settled states, exactly one primary confirmation button per screen, and state-change moments.
* **Payment Brand (Gold):** `var(--paypal)` (`#FFC439`) — Strictly reserved for buttons and indicators initiating real PayPal sandbox flows.
* **Debt Warning (Coral):** `var(--owes)` (`#FF5C5C`) — Reserved for overdue debts, balance discrepancies, and deletion actions.
* **Receipt System:** `var(--receipt-paper)` (`#F4F0E8`), `var(--receipt-ink)` (`#161614`) — Realistic thermal paper aesthetic.
* **Traveler Tags:** Deterministic, non-colliding tag tokens (`cyan`, `teal`, `violet`, `amber`, `emerald`, `indigo`) identifying group members.

---

## 🛠️ Architecture & Backend Interoperability

The frontend is architected to operate seamlessly in both live backend and autonomous mock modes:

* **Live Spring Boot Backend:** Connects via Axios to `http://localhost:8080/api` for JWT auth, double-entry ledger operations, and PayPal Sandbox order capture / batch payouts.
* **Python AI Microservice:** Connects to `http://localhost:8000/ai` for multimodal receipt OCR and natural language intent parsing.
* **Autonomous Mock Adapters:** If the backend or AI services are offline, built-in fallback state engines simulate 100% of the ledger math, receipt itemization, and PayPal sandbox events locally without crashing.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm 9+

### Setup & Run
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` (or the port Vite outputs) in your browser.

### Production Build & Linting
```bash
# Typecheck TypeScript without emitting files
npm run build

# Run Oxlint linter
npm run lint
```

---

## 📦 Project Structure

```
frontend/
├── public/                  # Static assets & favicons
├── src/
│   ├── api/                 # API service clients & endpoints
│   │   ├── axiosClient.ts   # Axios instance with JWT interceptors
│   │   ├── endpoints.ts     # Centralized backend & AI routes
│   │   ├── mockData.ts      # Empty & fallback state fixtures
│   │   └── services.ts      # Domain API services (ledger, expense, payment, ai, auth)
│   ├── components/
│   │   ├── bits/            # Interactive modal dialogs & paper receipt
│   │   │   ├── AddMemberModal.tsx       # Modal to invite/add travelers
│   │   │   ├── CreatePartyModal.tsx    # Modal to initiate a new travel group
│   │   │   ├── PaperReceipt.tsx        # Signature thermal paper receipt widget
│   │   │   └── ReceiptDropModal.tsx    # OCR scanning, item claiming, & custom split modal
│   │   ├── cards/           # Dashboard visual cards (VirtualTripCard.tsx)
│   │   ├── checkout/        # PayPal express checkout drawer (PayPalCheckoutDrawer.tsx)
│   │   ├── common/          # Smooth scroll (LenisProvider.tsx) & SVG Brand Logo (Logo.tsx)
│   │   ├── layout/          # Global navigation header (Navbar.tsx)
│   │   ├── settlement/      # Organizer batch payout modal (PayoutModal.tsx)
│   │   └── ui/              # Primitive atom components (Avatar.tsx, Button.tsx, StatusPill.tsx)
│   ├── lib/                 # Core utilities
│   │   ├── currency.ts      # Multi-currency formatting (INR, USD, EUR, GBP)
│   │   ├── formatters.ts    # Title casing, clean receipt IDs, party name sanitizers
│   │   ├── notifications.ts # Escalation frequency options
│   │   └── utils.ts         # Tailwind classnames merger (clsx + tailwind-merge)
│   ├── pages/               # Screen route views
│   │   ├── LedgerPage.tsx   # Detailed AG Grid transaction ledger & inspection modal
│   │   ├── LoginPage.tsx    # Split-screen terminal authentication view
│   │   ├── OverviewPage.tsx # Organizer dashboard, balances, & live paper receipt
│   │   ├── PayoutsPage.tsx  # Consolidated reimbursements & payout authorization
│   │   └── SimulatorPage.tsx# Interactive judge simulator with chat intent parser
│   ├── types/               # Complete TypeScript domain contracts & DTOs
│   ├── App.tsx              # Root router, application state, and dialog orchestrator
│   ├── index.css            # Design system tokens, AG Grid dark theme, and font imports
│   └── main.tsx             # React 19 application entrypoint
├── package.json             # Dependencies & build scripts
├── tsconfig.json            # Strict TypeScript configuration
└── vite.config.ts           # Vite bundler configuration with Tailwind CSS v4
```

---

## 🧮 Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4 + Design Tokens
- **Smooth Scroll:** Lenis (`data-lenis-prevent` scroll containment)
- **Data Grid:** AG Grid Community (`ag-theme-quartz-dark`)
- **Animation:** Framer Motion (respects `prefers-reduced-motion`)
- **Icons:** Lucide React
- **Celebration Effects:** Canvas Confetti
