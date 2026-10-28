# 🤖 TripSheriff AI Microservice
### Multimodal Receipt OCR, Agentic Tool-Calling & Escalating Debt Collector

FastAPI microservice serving intelligence to the Java core backend for the **PayPal AI Hackathon**.

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
uvicorn app.main:app --port 8001 --reload
```
API Documentation will be live at: `http://localhost:8001/docs`

---

## 📡 Endpoints for Java Backend

| Endpoint | Method | Description |
|---|---|---|
| `/health` | `GET` | Service status, active model, and mock mode indicator |
| `/ai/agent/decide` | `POST` | Parses raw chat text into structured tool-calling intent |
| `/ai/receipt/parse` | `POST` | Extracts line items, tax, and tip from receipt images |
| `/ai/escalate/roast` | `POST` | Generates 5-tier debt collection text & dynamic wanted cards |
