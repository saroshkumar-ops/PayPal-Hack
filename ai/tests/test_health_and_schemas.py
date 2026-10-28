import io
import base64
from PIL import Image
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


def get_valid_b64_img() -> str:
    img = Image.new("RGB", (32, 32), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "mock_mode" in data


@pytest.mark.asyncio
async def test_agent_decide_mock():
    payload = {
        "trip_id": "trip_bali_2026",
        "sender_id": "user_01",
        "sender_name": "Sarah",
        "message_text": "Paid $120 for seafood dinner split with everyone",
        "active_members": [
            {"user_id": "user_01", "name": "Sarah", "handle": "@sarah_c"},
            {"user_id": "user_02", "name": "Alex", "handle": "@alex_travels"}
        ]
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/agent/decide", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "LOG_EXPENSE"
    assert data["parsed_data"]["amount_cents"] == 12000


@pytest.mark.asyncio
async def test_escalate_roast_mock():
    payload = {
        "trip_id": "trip_bali_2026",
        "debtor_id": "user_02",
        "debtor_name": "Alex",
        "creditor_name": "Sarah",
        "amount_cents": 8000,
        "currency": "USD",
        "expense_description": "Villa Sunset",
        "hours_overdue": 36,
        "tier": "DISAPPOINTED_PARENT",
        "roast_consent": "SPICY",
        "paypal_checkout_url": "https://www.sandbox.paypal.com/checkoutnow?token=TEST"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/escalate/roast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "beta" in data["generated_text"] or "disappointed" in data["generated_text"]
    assert len(data["call_to_action_buttons"]) == 1


@pytest.mark.asyncio
async def test_receipt_parse_mock():
    payload = {
        "trip_id": "trip_bali_2026",
        "image_base64": get_valid_b64_img(),
        "currency": "USD"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/ai/receipt/parse", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_cents"] == 15600
    assert len(data["items"]) == 3
