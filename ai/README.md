# 🤖 TripSheriff AI Microservice
### Multimodal Receipt OCR, Agentic Tool-Calling & Escalating Debt Collector

FastAPI microservice serving intelligence to the Java core backend for the **PayPal AI Hackathon**.

---

## 📂 Modular Architecture

The AI service is cleanly partitioned into dedicated domain folders:

```
ai/
├── core/                # Shared utilities, config, moderation/safety, common schemas
│   ├── config.py
│   ├── schemas.py
│   └── moderation.py
├── receipts/            # [Task G] Multimodal Receipt OCR & Proportional Itemizer
│   ├── router.py
│   ├── vision_service.py
│   └── itemizer_service.py
├── escalation/          # [Task F] 5-Tier Personality Matrix & Roast Cards
│   ├── router.py
│   ├── personality_service.py
│   └── roast_card_service.py
├── agent/               # [Task F] Agentic Intent Parser & Tool-Calling Router
│   ├── router.py
│   └── agent_service.py
├── tests/               # Test suites for all modules
├── main.py              # Root FastAPI application mounting all domain routers
├── pytest.ini
├── requirements.txt
└── .env
```

---

## ⚡ Quickstart

### 1. Setup Virtual Environment
```bash
cd ai
python -m venv venv
.\venv\Scripts\activate  # On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If `GEMINI_API_KEY` is empty, the service automatically runs in Mock Mode so Java can query it immediately without API keys!)*

### 3. Run the Microservice
```bash
uvicorn main:app --port 8001 --reload
```
Interactive Swagger UI is live at: `http://localhost:8001/docs`

---

## 📡 Endpoints for Java Backend

| Endpoint | Method | Domain | Description |
|---|---|---|---|
| `/health` | `GET` | Core | Service health status, model, and mock mode |
| `/ai/agent/decide` | `POST` | Agent (Task F) | Parses raw chat text into structured tool-calling intent |
| `/ai/escalate/roast` | `POST` | Escalation (Task F) | Generates 5-tier debt collection text & dynamic wanted cards |
| `/ai/receipt/parse` | `POST` | Receipts (Task G) | Extracts line items, tax, and tip from base64 receipts |
| `/ai/receipt/upload` | `POST` | Receipts (Task G) | Multipart upload for testing receipt photos directly |
| `/ai/receipt/split` | `POST` | Receipts (Task G) | Calculates fair itemized split with proportional tax/tip |
