# 🤠 TripSheriff AI — Frontend & Judge Web Simulator

> Built for the **PayPal AI Hackathon 2026** (Devpost)  
> Competing for: **1st Place Grand Prize**, **Best Use of Agentic Commerce**, and **AG Grid Sponsor Prize**.

---

## 🌟 Overview

The **TripSheriff AI** frontend delivers two synchronized, professional interfaces designed for hackathon judges and group trip organizers:

1. **Hosted Judge Web Simulator (Task A Web):**
   - **Split-Screen Testing Portal:** Left pane simulates natural Telegram group chat conversation; right pane displays live integer-cent ledger balances and verified PayPal sandbox webhook events.
   - **Interactive Judge Triggers:** 
     - `[🍽️ Simulate $150 Dinner]`
     - `[⏰ Fast-Forward +24h]` (demonstrates debt aging and triggers comedic escalation tiers instantly)
     - `[💳 Test Pay Alex's $80 Share]` (simulates PayPal checkout approval + capture, updates ledger, and fires confetti)
     - Custom chat input allowing judges to type natural language expenses.

2. **Trip Organizer Dashboard with AG Grid (Task I):**
   - **Interactive AG Grid Data Grid:** Features multi-column sorting, quick filter, category grouping, and custom status cell renderers (`SETTLED`, `PENDING`, `ESCALATED`).
   - **Bipartite Minimum Cash Flow Engine:** Visualizes how circular group debts are simplified into minimal transactions ($O(N)$ optimization).
   - **PayPal Batch Payouts Authorization (Task D):** Organizer Human-in-the-Loop confirmation modal to disburse consolidated reimbursements with idempotent protection.

---

## 🛠️ Architecture & Backend Interop

This frontend is designed to run seamlessly in **both autonomous and connected modes**:

* **Live Java Backend Mode:** Connects to the team's Spring Boot backend on `http://localhost:8080` following the frozen REST contracts in `docs/TEAM_COLLABORATION_GUIDE.md`.
* **Autonomous Mock Adapter:** If the Java backend is still being built or offline, the included mock state engine runs 100% of the ledger math, debt heat score escalation, and PayPal sandbox event simulation locally.

---

## 🚀 Quickstart

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the Vite development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 📦 Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 (Dark/Indigo Fintech Aesthetic)
- **Data Grid:** AG Grid Community (`ag-theme-quartz-dark`)
- **Icons:** Lucide React
- **Celebration Effects:** Canvas Confetti
