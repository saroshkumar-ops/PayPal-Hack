# 🤖 TripSheriff AI Microservice
### Multimodal Receipt OCR, Agentic Tool-Calling & Escalating Debt Collector
*Component of **TripSheriff AI** — Built for the **PayPal AI Hackathon 2026***

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-orange.svg)](https://ai.google.dev/)
[![Tests Passing](https://img.shields.io/badge/Tests-9%2F9%20Passing-brightgreen.svg)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

---

## 🌟 Overview

The **TripSheriff AI Microservice** is a high-performance Python FastAPI service providing vision, natural language understanding, and comedic personality generation to the core Java backend.

It exposes three primary capabilities over local REST:
1. 🧾 **Multimodal Receipt OCR & Itemizer (`/ai/receipt/*`):** Uses Google Gemini 2.0 Flash Vision to extract line items, merchant, tax, and tip from receipt photos, and computes fair group splits with proportional tax/tip allocation.
2. 🤖 **Agentic Intent & Tool-Calling Router (`/ai/agent/decide`):** Translates unstructured group chat messages (*"Paid $60 for gas split with Alex"*) into structured financial actions.
3. 🎭 **5-Tier Escalating Personality Matrix (`/ai/escalate/roast`):** Crafts tone-calibrated debt collection reminders (Polite $\rightarrow$ Passive-Aggressive $\rightarrow$ Disappointed Parent $\rightarrow$ Public Roast $\rightarrow$ Itinerary Embargo) and dynamically generates "WANTED: Deadbeat" meme cards.

---

## 📂 Modular Architecture

```
ai/
├── core/                # Shared utilities, configuration, safety, and schemas
│   ├── config.py        # Settings loaded from environment & .env
│   ├── schemas.py       # Pydantic models with integer-cent monetary fields
│   └── moderation.py    # Regex & safety guardrails against harassment/slurs
│
├── receipts/            # [Task G] Multimodal Receipt OCR & Proportional Itemizer
│   ├── router.py        # Endpoints: /ai/receipt/parse, /upload, /split
│   ├── vision_service.py# Gemini 2.0 Flash Vision client & image preprocessor
│   └── itemizer_service.py # Fair tax/tip allocation & zero-drift math engine
│
├── escalation/          # [Task F] 5-Tier Personality Matrix & Roast Generator
│   ├── router.py        # Endpoint: /ai/escalate/roast
│   ├── personality_service.py # Calibrated prompt personas
│   └── roast_card_service.py  # Pillow generator for WANTED image cards
│
├── agent/               # [Task F] Chat Tool-Calling & Intent Router
│   ├── router.py        # Endpoint: /ai/agent/decide
│   └── agent_service.py # Intent classification & argument extractor
│
├── tests/               # Pytest suite with 100% endpoint & math coverage
│   ├── test_health_and_schemas.py
│   └── test_receipt_ocr.py
│
├── main.py              # Root FastAPI application mounting all domain routers
├── pytest.ini           # Pytest runner configuration
├── requirements.txt     # Locked production dependencies
├── .env.example         # Environment variable template
└── README.md            # This documentation
```

---

## ⚡ Quickstart

### 1. Prerequisites
- Python 3.11+
- Git

### 2. Install Dependencies
```bash
cd ai
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Setup
```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local service port | `8001` |
| `HOST` | Binding host address | `0.0.0.0` |
| `USE_MOCK_AI` | When `true`, returns instant deterministic mocks without calling Gemini | `true` |
| `GEMINI_API_KEY` | Your Google AI Studio API key | *(Optional for mock mode)* |
| `GEMINI_MODEL` | Gemini vision model identifier | `gemini-2.0-flash` |

> [!TIP]
> **Zero-Blocker Mock Mode:** If `GEMINI_API_KEY` is left blank or `USE_MOCK_AI=true`, all endpoints return mathematically balanced sample data instantly. Your Java backend teammates can build and test immediately without external API keys or rate limits.

### 4. Run the Service
```bash
uvicorn main:app --port 8001 --reload
```
- **Service Root:** `http://localhost:8001`
- **Interactive Swagger Docs (OpenAPI):** `http://localhost:8001/docs`
- **Health Check:** `http://localhost:8001/health`

---

## 📡 API Reference & Sample Payloads

### 1. Receipt OCR — Base64 Image (`POST /ai/receipt/parse`)
Extracts line items, merchant, tax, and tip from a base64 encoded photo.

* **Request:**
```json
{
  "trip_id": "trip_bali_2026",
  "image_base64": "data:image/png;base64,iVBORw0KGgo...",
  "currency": "USD"
}
```

* **Response:**
```json
{
  "status": "SUCCESS",
  "merchant": "Sunset Beach Bistro",
  "date": "2026-10-26",
  "subtotal_cents": 12000,
  "tax_cents": 1200,
  "tip_cents": 2400,
  "total_cents": 15600,
  "items": [
    {"index": 0, "name": "Grilled Red Snapper", "qty": 1, "price_cents": 4500},
    {"index": 1, "name": "Truffle Fries", "qty": 2, "price_cents": 2500},
    {"index": 2, "name": "Tropical Cocktails", "qty": 3, "price_cents": 5000}
  ],
  "suggested_reply": "🧾 Extracted receipt from **Sunset Beach Bistro** ($156.00). Found 3 items. Tap buttons below to claim what you ordered!"
}
```

---

### 2. Proportional Receipt Split (`POST /ai/receipt/split`)
Calculates individual member shares from claimed receipt items, allocating tax and tip strictly in proportion to each member's spend.

* **Request:**
```json
{
  "receipt": { ... },
  "claims": {
    "user_sarah": [0],
    "user_alex": [1],
    "user_dave": [2]
  },
  "all_members": ["user_sarah", "user_alex", "user_dave"],
  "split_unclaimed_equally": true
}
```

* **Response:**
```json
{
  "receipt_total_cents": 15600,
  "is_balanced": true,
  "discrepancy_cents": 0,
  "shares": {
    "user_sarah": {
      "user_id": "user_sarah",
      "items_subtotal_cents": 4500,
      "proportional_tax_cents": 450,
      "proportional_tip_cents": 900,
      "total_cents": 5850,
      "breakdown_text": "Items: $45.00 (Grilled Red Snapper) | Shared Pool: $0.00 | Tax: $4.50 | Tip: $9.00 | Total: $58.50"
    },
    "user_alex": { "total_cents": 3250 },
    "user_dave": { "total_cents": 6500 }
  }
}
```

---

### 3. Escalating Debt Roast (`POST /ai/escalate/roast`)
Generates comedic debt collection messages across 5 distinct personality tiers.

* **Request:**
```json
{
  "trip_id": "trip_bali_2026",
  "debtor_id": "user_02",
  "debtor_name": "Alex",
  "creditor_name": "Sarah",
  "amount_cents": 8000,
  "currency": "USD",
  "expense_description": "Villa Sunset Deposit",
  "hours_overdue": 36,
  "tier": "DISAPPOINTED_PARENT",
  "roast_consent": "SPICY",
  "paypal_checkout_url": "https://www.sandbox.paypal.com/checkoutnow?token=TEST_TOKEN"
}
```

* **Response:**
```json
{
  "tier": "DISAPPOINTED_PARENT",
  "generated_text": "Alex beta, I'm not angry, just disappointed. Is this how we raised you? To drink craft cocktails while Sarah covers your $80.00 Villa Sunset Deposit?",
  "image_card_base64": null,
  "call_to_action_buttons": [
    {
      "text": "💳 Pay $80.00 via PayPal",
      "url": "https://www.sandbox.paypal.com/checkoutnow?token=TEST_TOKEN"
    }
  ]
}
```
*(If `tier == "PUBLIC_ROAST"`, `image_card_base64` contains the generated "WANTED: DEADBEAT" PNG poster).*

---

### 4. Agent Tool-Calling Router (`POST /ai/agent/decide`)
Translates conversational text into structured actions.

* **Request:**
```json
{
  "trip_id": "trip_bali_2026",
  "sender_id": "user_01",
  "sender_name": "Sarah",
  "message_text": "Paid $120 for seafood dinner split with @alex_travels and @dave_k",
  "active_members": [
    {"user_id": "user_01", "name": "Sarah", "handle": "@sarah_c"},
    {"user_id": "user_02", "name": "Alex", "handle": "@alex_travels"},
    {"user_id": "user_03", "name": "Dave", "handle": "@dave_k"}
  ]
}
```

* **Response:**
```json
{
  "action": "LOG_EXPENSE",
  "confidence": 0.92,
  "parsed_data": {
    "description": "Seafood Dinner",
    "amount_cents": 12000,
    "currency": "USD",
    "payer_id": "user_01",
    "split_type": "EQUAL",
    "split_with_user_ids": ["user_01", "user_02", "user_03"]
  },
  "reply_text": "🍽️ Logged **$120.00 Seafood Dinner** paid by Sarah."
}
```

---

## 🧪 Testing & Verification

Run the full automated test suite using `pytest`:

```bash
cd ai
pytest -v
```

Expected output:
```
tests/test_health_and_schemas.py::test_health PASSED
tests/test_health_and_schemas.py::test_agent_decide_mock PASSED
tests/test_health_and_schemas.py::test_escalate_roast_mock PASSED
tests/test_health_and_schemas.py::test_receipt_parse_mock PASSED
tests/test_receipt_ocr.py::test_parse_receipt_base64_mock PASSED
tests/test_receipt_ocr.py::test_parse_receipt_invalid_base64 PASSED
tests/test_receipt_ocr.py::test_upload_file_endpoint PASSED
tests/test_receipt_ocr.py::test_itemizer_proportional_tax_tip_split PASSED
tests/test_receipt_ocr.py::test_itemizer_shared_item_and_unclaimed_pool PASSED

============================== 9 passed in 0.85s ==============================
```

---

## 🔒 Financial & Ethical Safeguards

1. **Integer-Cent Math:** All internal prices and split calculations use strict integer cents (`int`), eliminating floating-point rounding errors and discrepancies.
2. **Deterministic Zero-Drift Reconciliation:** The itemizer reconciles integer division remainders against the bill total, ensuring `sum(shares) == total_cents` down to the exact penny.
3. **Safety & Moderation Filter:** All AI-generated text is screened to guarantee playful comedy while strictly blocking profanity, hate speech, or real harassment.
4. **Consent-Gated Roasts:** Users explicitly opt in to their roast level (`MILD`, `SPICY`, or `NO_ROAST`) during onboarding.
