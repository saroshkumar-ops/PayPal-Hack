import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Query, HTTPException, Response, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from core.config import settings
from gateway.whatsapp_gateway import WhatsAppGatewayService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class WhatsAppTestRequest(BaseModel):
    from_phone: str = "919876543210"
    sender_name: str = "Sarosh Kumar"
    message_text: str = "Paid $90 for seafood dinner split with @Sudhanva_k"


@router.get("/status")
async def get_whatsapp_status():
    """
    Returns WhatsApp Cloud API integration status and active configuration.
    """
    is_live = bool(settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)
    return {
        "status": "ready",
        "mode": "LIVE_GRAPH_API" if is_live else "AUTONOMOUS_SIMULATOR",
        "phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID or "not_set",
        "api_version": settings.WHATSAPP_API_VERSION,
        "webhook_verify_token_configured": bool(settings.WHATSAPP_VERIFY_TOKEN),
        "webhook_endpoint": "/whatsapp/webhook",
    }


@router.get("/webhook")
async def verify_meta_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta Webhook Verification Endpoint.
    When you configure your webhook in developers.facebook.com, Meta sends:
    GET /whatsapp/webhook?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=tripsheriff_webhook_verify_2026
    """
    expected_token = settings.WHATSAPP_VERIFY_TOKEN

    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        logger.info("Meta WhatsApp webhook verified successfully!")
        return PlainTextResponse(content=hub_challenge or "", status_code=200)

    logger.warning(f"Meta webhook verification failed: mode={hub_mode}, token={hub_verify_token}")
    raise HTTPException(status_code=403, detail="Forbidden: Invalid verify token")


@router.post("/webhook")
async def receive_meta_webhook(request: Request):
    """
    Meta Webhook Ingestion Endpoint.
    Receives incoming WhatsApp messages (text, receipts, button clicks) from Meta Cloud API.
    """
    try:
        payload = await request.json()
    except Exception as exc:
        logger.error(f"Invalid JSON in WhatsApp webhook: {exc}")
        return {"status": "error", "message": "Invalid JSON"}

    # Validate Meta event structure
    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            val = change.get("value", {})
            messages = val.get("messages", [])
            contacts = val.get("contacts", [])

            sender_name = contacts[0].get("profile", {}).get("name", "Traveler") if contacts else "Traveler"

            for msg in messages:
                from_phone = msg.get("from", "")
                msg_type = msg.get("type", "text")
                body = None
                media_id = None

                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "")
                elif msg_type == "image":
                    img_data = msg.get("image", {})
                    media_id = img_data.get("id")
                    body = img_data.get("caption", "")
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    button_reply = interactive.get("button_reply", {})
                    body = button_reply.get("id") or button_reply.get("title", "")

                try:
                    await WhatsAppGatewayService.process_incoming_message(
                        from_phone=from_phone,
                        sender_name=sender_name,
                        message_type=msg_type,
                        text_body=body,
                        media_id=media_id,
                    )
                except Exception as exc:
                    logger.error(f"Error handling incoming WhatsApp message: {exc}", exc_info=True)

    # Meta requires a fast 200 OK response within 3 seconds
    return {"status": "ok"}


@router.post("/test")
async def test_whatsapp_message(req: WhatsAppTestRequest):
    """
    Interactive simulation endpoint:
    Test what TripSheriff would do when receiving a WhatsApp message, without needing live Meta credentials!
    """
    result = await WhatsAppGatewayService.process_incoming_message(
        from_phone=req.from_phone,
        sender_name=req.sender_name,
        message_type="text",
        text_body=req.message_text,
    )
    return {
        "status": "success",
        "input": req.model_dump(),
        "sheriff_decision": result,
    }
