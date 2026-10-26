# 🤠 TripSheriff AI
### Autonomous Group Travel Treasury & Escalating Debt Enforcement Agent
*Built for the **PayPal AI Hackathon 2026***

[![PayPal Developer](https://img.shields.io/badge/PayPal-Sandbox%20Integrated-blue.svg)](https://developer.paypal.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)

---

## 🌟 Overview

**TripSheriff AI** is an autonomous agent that lives in your group travel chat (Telegram). It acts as the trip's automated CFO and debt collector:

- 🧾 **Multimodal Expense Ingestion:** Drop receipt photos or send 5-second voice notes; AI extracts items, tax, and tip.
- 🧮 **Double-Entry Ledger & Debt Simplification:** Mathematically optimizes circular debts and maintains net balances.
- 💳 **Instant PayPal Checkout:** Generates 1-click payment links using the **PayPal Orders API**.
- 💸 **Consolidated Batch Settlements:** Reimburses fronted costs in seconds using the **PayPal Batch Payouts API**.
- 🔔 **Closed-Loop Real-Time Webhooks:** Listens to `PAYMENT.CAPTURE.COMPLETED` events to celebrate payments and clear debts instantly in chat.
- 🎭 **The Escalating Debt Collector Matrix:** When friends drag their feet, the agent autonomously escalates through 5 comedic psychological enforcement tiers:
  1. *Tier 1: Polite Concierge* (Gentle reminder + checkout link)
  2. *Tier 2: Passive-Aggressive Roommate* ("Must be nice enjoying that rooftop drink while Dave fronts your hotel...")
  3. *Tier 3: Disappointed Parent* ("Alex beta, we didn't raise you to dodge a $42 paella split")
  4. *Tier 4: Public Roast Mode* (Generates custom meme/roast card in group chat)
  5. *Tier 5: Itinerary Embargo* ("Sanction applied: Demoted to sleeping on the pull-out couch")

---

## 📋 Comprehensive Implementation Plan

The complete, battle-tested architectural specification, contract schemas, task breakdowns, claims ledger, and video storyboard are documented in:

👉 **[Master Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`)](docs/IMPLEMENTATION_PLAN.md)**

### Key Highlights from the Plan:
- **Four Shared Locked Contracts:** Expense & Ledger Schema, Escalation Matrix State Machine, PayPal API/Webhook Contract, and Chat Gateway Interface.
- **Priority Build Tasks (A through M):** From core math and PayPal Orders/Payouts to AG Grid Dashboard and Render Deployment.
- **Strict Claims Ledger:** What is proven, what is measured, and clear boundaries that guarantee honest, credible hackathon judging.
- **Live 3-Minute Demo Video Storyboard:** Timed to the second for maximum humor, technical clarity, and prize qualification.

---

## 🏗️ Architecture

```
                       ┌────────────────────────────┐
                       │   Telegram / Group Chat    │
                       └─────────────┬──────────────┘
                                     │ (Voice, Photo Receipts, Text)
                                     ▼
                       ┌────────────────────────────┐
                       │   FastAPI Webhook Gateway  │
                       └──────┬──────────────┬──────┘
                              │              │
             ┌────────────────┘              └────────────────┐
             ▼                                                ▼
┌──────────────────────────┐                    ┌──────────────────────────┐
│ Multimodal AI Extractor  │                    │ Double-Entry Trip Ledger │
│ (Gemini 1.5 / Whisper)   │                    │ (Debt Simplification)    │
└────────────┬─────────────┘                    └─────────────┬────────────┘
             │                                                │
             └────────────────┬───────────────────────────────┘
                              ▼
               ┌─────────────────────────────┐
               │    PayPal Sandbox Suite     │
               ├─────────────────────────────┤
               │ • Orders API (v2)           │
               │ • Batch Payouts API (v1)    │
               │ • Invoicing API (v2)        │
               │ • Real-time Webhooks        │
               └──────────────┬──────────────┘
                              │
                              ▼
               ┌─────────────────────────────┐
               │  AG Grid Organizer Portal   │
               │  (Live Multi-Currency View) │
               └─────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+
- A [PayPal Developer Sandbox](https://developer.paypal.com/) account (Client ID & Secret)
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Gemini or OpenAI API Key

### 2. Setup
```bash
git clone https://github.com/saroshkumar-ops/PayPal-Hack.git
cd PayPal-Hack

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies (once generated)
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id

TELEGRAM_BOT_TOKEN=your_botfather_token
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///./tripsheriff.db
```

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
