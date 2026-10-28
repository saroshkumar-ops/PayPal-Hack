# 🤠 TripSheriff AI
### Autonomous Group Travel Treasury & Debt Enforcement Agent
*Built for the **PayPal AI Hackathon 2026** (Devpost)*

[![PayPal Developer](https://img.shields.io/badge/PayPal-Sandbox%20Integrated-blue.svg)](https://developer.paypal.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-Enabled-red.svg)](https://www.ag-grid.com/)
[![Render](https://img.shields.io/badge/Hosted%20on-Render-46E3B7.svg)](https://render.com/)

---

## 🌟 Overview

**TripSheriff AI** solves the painful, awkward social debt friction of group travel. It operates across **two synchronized interfaces**:
1. **A live Telegram group bot** where friends naturally converse, drop photo receipts, and settle debts with 1-click PayPal buttons.
2. **A Hosted Web Simulator & Organizer Dashboard** enabling hackathon judges and organizers to test the entire agentic loop, ledger, and PayPal sandbox transactions in a single browser window without configuring Telegram.

---

## 🚀 Key Features

- 🧾 **Multimodal Receipt Itemizer:** Snap a crumpled restaurant receipt $\rightarrow$ AI extracts line items, tax, and tip $\rightarrow$ renders interactive buttons for friends to claim their items.
- 🧮 **Double-Entry Integer-Cent Ledger:** Zero rounding drift with bipartite minimum-cash-flow debt simplification.
- 💳 **PayPal Orders API (v2) with Two-Step Capture:** Generates 1-click payment links with `experience_context` and captures upon buyer approval via both redirect capture (`/payment/success`) and the `CHECKOUT.ORDER.APPROVED` webhook.
- 💸 **PayPal Batch Payouts API (v1):** Reimburses organizers or settles multi-party balances with 1-click Human-in-the-Loop confirmation.
- 🔔 **Cryptographic Real-Time Webhooks:** Listens to `PAYMENT.CAPTURE.COMPLETED` to celebrate payments and clear debts instantly in chat.
- 🤖 **Agentic Tool-Calling Loop:** An autonomous decision coordinator that evaluates trip status, balances, and overdue days to choose its next action (`create_payment_order`, `escalate_reminder`, `propose_payout_batch`).
- 🎭 **Consensual Escalating Personality Matrix:** Opt-in comedic escalation (`MILD`, `SPICY`, or `NO_ROAST`):
  - *Tier 1: Polite Concierge* (Gentle reminder + checkout link)
  - *Tier 2: Passive-Aggressive Roommate* ("Must be nice enjoying that rooftop drink while Sarah fronts your bed...")
  - *Tier 3: Disappointed Parent* ("Alex beta, is this how we raised you? Leaving Sarah to carry your hotel costs?")
  - *Tier 4: Public Roast Mode* (Generates custom meme/roast card in group chat)
  - *Tier 5: Itinerary Embargo* ("Trip sanction: Demoted to the pull-out couch until the $80 clears")

---

## 🏗️ Architecture

```
                                  ┌──────────────────────────────┐
                                  │      Incoming Triggers       │
                                  ├──────────────┬───────────────┤
                                  │ Telegram Bot │ Web Simulator │
                                  └──────┬───────┴───────┬───────┘
                                         │               │
                                         ▼               ▼
                              ┌───────────────────────────────────┐
                              │     FastAPI Gateway Engine        │
                              └──────┬─────────────────────┬──────┘
                                     │                     │
                     ┌───────────────┘                     └────────────────┐
                     ▼                                                      ▼
       ┌───────────────────────────┐                         ┌───────────────────────────┐
       │   Agentic AI Coordinator  │                         │ Double-Entry Trip Ledger  │
       │   (Gemini 2.0 Tool-Loop)  │                         │ (Integer-Cent Math Core)  │
       └─────────────┬─────────────┘                         └──────────────┬────────────┘
                     │                                                      │
                     └──────────────────────┬───────────────────────────────┘
                                            ▼
                             ┌──────────────────────────────┐
                             │    PayPal Sandbox Suite      │
                             ├──────────────────────────────┤
                             │ • Orders API (v2) + Capture  │
                             │ • Batch Payouts API (v1)     │
                             │ • Webhook Verification       │
                             └──────────────┬───────────────┘
                                            │
                                            ▼
                             ┌──────────────────────────────┐
                             │   AG Grid Organizer Portal   │
                             │   (Live WebSocket Updates)   │
                             └──────────────────────────────┘
```

---

## 📋 Documentation & Team Collaboration

The architecture, locked cross-service contracts, role execution plans, and hackathon strategy are fully documented:

👉 **[Cross-Task Team Collaboration & Interface Guide (`docs/TEAM_COLLABORATION_GUIDE.md`)](docs/TEAM_COLLABORATION_GUIDE.md)**  
*Detailed microservice topology, frozen REST schemas between Java Backend & Python AI, and zero-blocker parallel roadmap.*

👉 **[Master Implementation Plan (v2.0) (`docs/IMPLEMENTATION_PLAN.md`)](docs/IMPLEMENTATION_PLAN.md)**  
*Comprehensive architectural specification, locked contracts, claims ledger, and timed 3-minute video storyboard.*

---

## ⚖️ Honest Platform & Custody Disclosure

In this hackathon demonstration, incoming member payments are collected into the prototype's PayPal sandbox platform account as a pooled escrow proxy, and outbound settlements are disbursed using the PayPal Batch Payouts API. 

TripSheriff operates as a **platform-mediated prototype**. In a production commercial release, direct multi-party funds routing would be implemented using **PayPal Complete Payments / PayPal Commerce Platform (Marketplace Payee Routing)** with custom payee declarations in `purchase_units` or licensed third-party custodial rails. We do not claim to be an independent non-custodial bank.

---

## 🛠️ Quickstart (For Hackathon Judges)

### Option 1: Instant Web Simulator Mode (Zero Telegram Config)
1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/saroshkumar-ops/PayPal-Hack.git
   cd PayPal-Hack
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```
3. Open `http://localhost:8000/simulator` in your browser.
4. Click **[Simulate Expense]**, **[Simulate Time +24h]**, and **[Test PayPal Checkout]** to evaluate the entire agentic loop without needing Telegram.

### Option 2: Live Telegram Group Bot
1. Disable privacy mode in [@BotFather](https://t.me/BotFather): `/setprivacy` $\rightarrow$ `Disable`.
2. Add the bot to your test Telegram group.
3. Invite friends and type `/newtrip Bali 2026 USD`.
4. Tap the deep-link button to join and set your roast consent.

---

## 🏆 Target Hackathon Prizes

- 🥇 **Grand Prize (1st Place):** $12,000
- 🤖 **Best Use of Agentic Commerce:** $5,000
- 🎬 **Best Demo Delivery:** $5,000
- 📊 **AG Grid Sponsor Prize**
- ☁️ **Render Sponsor Prize**

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
