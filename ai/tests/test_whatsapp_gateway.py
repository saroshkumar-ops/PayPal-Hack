import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from main import app
from gateway.whatsapp_gateway import WhatsAppGatewayService, get_or_create_wa_profile


@pytest.mark.asyncio
async def test_whatsapp_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/whatsapp/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["webhook_endpoint"] == "/whatsapp/webhook"


@pytest.mark.asyncio
async def test_meta_webhook_verification_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "987654321",
                "hub.verify_token": "tripsheriff_webhook_verify_2026",
            },
        )
    assert res.status_code == 200
    assert res.text == "987654321"


@pytest.mark.asyncio
async def test_meta_webhook_verification_wrong_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/whatsapp/webhook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "987654321",
                "hub.verify_token": "fraudulent_token",
            },
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_whatsapp_receive_webhook_expense():
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WH_ACC_01",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550001",
                                "phone_number_id": "123456",
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Sarosh Kumar"},
                                    "wa_id": "919876543210",
                                }
                            ],
                            "messages": [
                                {
                                    "from": "919876543210",
                                    "id": "wamid.test_01",
                                    "timestamp": "1730000000",
                                    "type": "text",
                                    "text": {
                                        "body": "Paid $90 for seafood dinner split with @Sudhanva_k"
                                    },
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/whatsapp/webhook", json=payload)
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_whatsapp_command_roast():
    res = await WhatsAppGatewayService.process_incoming_message(
        from_phone="919876543210",
        sender_name="Sarosh Kumar",
        message_type="text",
        text_body="/roast ROAST",
    )
    assert res["action"] == "ROAST"
    assert res["tier"] == "PUBLIC_ROAST"
    assert "TRIPSHERIFF BOUNTY ALERT" in res["caption"]


@pytest.mark.asyncio
async def test_whatsapp_command_balance():
    res = await WhatsAppGatewayService.process_incoming_message(
        from_phone="919876543210",
        sender_name="Sarosh Kumar",
        message_type="text",
        text_body="/balance",
    )
    assert res["action"] == "BALANCE"
    assert "TripSheriff" in res["reply"]
    assert "$80.00" in res["reply"]


@pytest.mark.asyncio
async def test_whatsapp_command_sim_time():
    res = await WhatsAppGatewayService.process_incoming_message(
        from_phone="919876543210",
        sender_name="Sarosh Kumar",
        message_type="text",
        text_body="/sim_time +24h",
    )
    assert res["action"] == "SIM_TIME"
    assert res["hours"] == 24
    assert res["score"] >= 0


@pytest.mark.asyncio
async def test_whatsapp_test_endpoint():
    payload = {
        "from_phone": "919876543210",
        "sender_name": "Sarosh Kumar",
        "message_text": "Paid $120 for villa groceries split with everyone",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/whatsapp/test", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["sheriff_decision"]["action"] == "LOG_EXPENSE"
