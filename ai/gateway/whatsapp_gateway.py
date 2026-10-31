import io
import re
import os
import sys
import json
import base64
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

# Ensure ai package root is in sys.path
_ai_root = Path(__file__).resolve().parent.parent
if str(_ai_root) not in sys.path:
    sys.path.insert(0, str(_ai_root))

import httpx
from core.config import settings
from core.schemas import (
    AgentDecideRequest,
    MemberSummary,
    EscalateRoastRequest,
    AgentLoopRequest,
    DebtEntry,
)
from agent.agent_service import AgentRouterService
from agent.agent_loop_service import AgentLoopService
from receipts.vision_service import ReceiptVisionService
from escalation.personality_service import PersonalityMatrixService
from escalation.roast_card_service import RoastCardGenerator

logger = logging.getLogger(__name__)

# In-memory member profiles and trip state for WhatsApp sessions
_WA_PROFILES: Dict[str, Dict[str, Any]] = {}
_WA_TRIPS: Dict[str, Dict[str, Any]] = {
    "trip_bali_2026": {
        "name": "Bali Summer Vacation 2026",
        "currency": "USD",
        "members": [
            {"user_id": "user_01", "name": "Sarah", "handle": "@sarah_c", "paypal_email": "sarah.organizer@personal.example.com", "role": "organizer", "roast_consent": "SPICY"},
            {"user_id": "user_02", "name": "Alex", "handle": "@alex_travels", "paypal_email": "alex.debtor@personal.example.com", "role": "member", "roast_consent": "SPICY", "heat_score": 75},
            {"user_id": "user_03", "name": "Dave", "handle": "@dave_k", "paypal_email": "dave.payer@personal.example.com", "role": "member", "roast_consent": "MILD", "heat_score": 15},
        ],
        "hours_advanced": 0,
    }
}


def get_or_create_wa_profile(phone: str, name: Optional[str] = None) -> Dict[str, Any]:
    clean_phone = phone.replace("+", "").strip()
    if clean_phone not in _WA_PROFILES:
        display_name = name or f"User_{clean_phone[-4:]}"
        _WA_PROFILES[clean_phone] = {
            "user_id": f"wa_{clean_phone}",
            "name": display_name,
            "handle": f"@{display_name.lower().replace(' ', '_')}",
            "paypal_email": f"{display_name.lower().replace(' ', '.')}.sandbox@personal.example.com",
            "roast_consent": "SPICY",
            "trip_id": "trip_bali_2026",
        }
    return _WA_PROFILES[clean_phone]


class WhatsAppGatewayService:
    """
    Handles Meta WhatsApp Cloud API (Graph API) communication,
    event ingestion, intent routing, and dynamic multimedia responses.
    """

    @staticmethod
    def get_graph_url(endpoint: str = "messages") -> str:
        version = settings.WHATSAPP_API_VERSION or "v21.0"
        phone_id = settings.WHATSAPP_PHONE_NUMBER_ID or "simulated_phone_id"
        return f"https://graph.facebook.com/{version}/{phone_id}/{endpoint}"

    @classmethod
    async def send_text_message(cls, to_phone: str, text: str, preview_url: bool = True) -> Dict[str, Any]:
        """
        Sends an outbound WhatsApp text message via Meta Graph API.
        Falls back to logging / simulation if live credentials are not set.
        """
        token = settings.WHATSAPP_ACCESS_TOKEN
        phone_id = settings.WHATSAPP_PHONE_NUMBER_ID

        clean_to = to_phone.replace("+", "").strip()

        if not token or not phone_id:
            logger.info(f"[WhatsApp Mock Outbound] To: {clean_to} | Body:\n{text}")
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": clean_to, "wa_id": clean_to}],
                "messages": [{"id": f"wamid_mock_{os.urandom(6).hex()}"}],
                "mock_mode": True,
            }

        url = cls.get_graph_url("messages")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": text,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    return res.json()
                else:
                    logger.error(f"Meta Graph API error ({res.status_code}): {res.text}")
                    return {"error": res.text, "status_code": res.status_code}
        except Exception as exc:
            logger.error(f"Failed to send WhatsApp message to {clean_to}: {exc}")
            return {"error": str(exc)}

    @classmethod
    async def send_image_message(cls, to_phone: str, image_bytes: bytes, caption: str = "") -> Dict[str, Any]:
        """
        Uploads an image to Meta Media API and dispatches it as a WhatsApp media message.
        """
        token = settings.WHATSAPP_ACCESS_TOKEN
        phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
        clean_to = to_phone.replace("+", "").strip()

        if not token or not phone_id:
            logger.info(f"[WhatsApp Mock Image Outbound] To: {clean_to} | Caption: {caption} | Image: {len(image_bytes)} bytes")
            return {
                "messaging_product": "whatsapp",
                "contacts": [{"input": clean_to, "wa_id": clean_to}],
                "messages": [{"id": f"wamid_mock_img_{os.urandom(6).hex()}"}],
                "mock_mode": True,
            }

        # 1. Upload media to Meta
        media_url = cls.get_graph_url("media")
        headers = {"Authorization": f"Bearer {token}"}
        files = {
            "file": ("wanted_poster.png", image_bytes, "image/png"),
            "messaging_product": (None, "whatsapp"),
            "type": (None, "image/png"),
        }

        media_id = None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(media_url, headers=headers, files=files)
                if res.status_code in (200, 201):
                    media_id = res.json().get("id")
                else:
                    logger.warning(f"Failed to upload media to Meta ({res.status_code}), falling back to text caption: {res.text}")
        except Exception as e:
            logger.warning(f"Error uploading WhatsApp media: {e}")

        # 2. If uploaded successfully, send image message
        if media_id:
            msg_url = cls.get_graph_url("messages")
            msg_payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_to,
                "type": "image",
                "image": {
                    "id": media_id,
                    "caption": caption,
                },
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(msg_url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json=msg_payload)
                    return res.json()
            except Exception as e:
                logger.error(f"Error sending WhatsApp image message: {e}")

        # Fallback: send as text message
        return await cls.send_text_message(clean_to, f"🚨 *WANTED MEME BOUNTY POSTER*\n\n{caption}")

    @classmethod
    async def download_media_bytes(cls, media_id: str) -> Optional[bytes]:
        """
        Downloads media bytes from Meta Cloud API given a media ID.
        """
        token = settings.WHATSAPP_ACCESS_TOKEN
        if not token:
            return None

        version = settings.WHATSAPP_API_VERSION or "v21.0"
        url = f"https://graph.facebook.com/{version}/{media_id}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # 1. Get media download URL
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    return None
                download_url = res.json().get("url")
                if not download_url:
                    return None

                # 2. Download binary bytes
                bin_res = await client.get(download_url, headers=headers)
                if bin_res.status_code == 200:
                    return bin_res.content
        except Exception as exc:
            logger.error(f"Failed to download WhatsApp media {media_id}: {exc}")
        return None

    @classmethod
    async def process_incoming_message(
        cls,
        from_phone: str,
        sender_name: str,
        message_type: str,
        text_body: Optional[str] = None,
        media_id: Optional[str] = None,
        media_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Core router for incoming WhatsApp events.
        Processes commands, NLP expense splitting, multimodal receipt OCR, and roasts.
        """
        profile = get_or_create_wa_profile(from_phone, sender_name)
        text = (text_body or "").strip()

        # Clean surrounding quotes
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1].strip()

        normalized = text.lower()

        # -------------------------------------------------------------
        # 1. Command Handlers (/balance, /roast, /sim_time, /help)
        # -------------------------------------------------------------
        if normalized.startswith(("/roast", "!roast")):
            tokens = text.split()
            tier = "PUBLIC_ROAST"
            if len(tokens) > 1 and tokens[1].upper() in ["POLITE", "PASSIVE", "PARENT", "ROAST", "EMBARGO"]:
                mapping = {
                    "POLITE": "POLITE_CONCIERGE",
                    "PASSIVE": "PASSIVE_AGGRESSIVE",
                    "PARENT": "DISAPPOINTED_PARENT",
                    "ROAST": "PUBLIC_ROAST",
                    "EMBARGO": "ITINERARY_EMBARGO",
                }
                tier = mapping.get(tokens[1].upper(), "PUBLIC_ROAST")

            roast_req = EscalateRoastRequest(
                trip_id="trip_bali_2026",
                debtor_id="user_02",
                debtor_name="Alex",
                debtor_handle="@alex_travels",
                creditor_name="Sarah",
                amount_cents=8000,
                currency="USD",
                expense_description="Sunset Villa Deposit",
                hours_overdue=50,
                roast_consent="SPICY",
                tier=tier, # type: ignore
                paypal_checkout_url="https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
            )
            roast_resp = await PersonalityMatrixService.generate_escalated_message(roast_req)

            caption = (
                f"🚨 *TRIPSHERIFF BOUNTY ALERT*\n\n"
                f"{roast_resp.generated_text}\n\n"
                f"💳 *Settle Share via PayPal:*\n{roast_req.paypal_checkout_url}"
            )

            # Generate Pillow WANTED card
            card_b64 = RoastCardGenerator.generate_wanted_card(
                debtor_name="Alex Rivera",
                amount_cents=8000,
                description="Sunset Villa Deposit",
                debtor_handle="@alex_travels",
                creditor_name="Sarah",
            )
            card_bytes = base64.b64decode(card_b64)

            await cls.send_image_message(from_phone, card_bytes, caption=caption)
            return {"action": "ROAST", "tier": tier, "caption": caption}

        elif normalized.startswith(("/balance", "!balance")):
            trip_id = "trip_bali_2026"
            # Try Java backend first
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{settings.BACKEND_URL}/api/trips/{trip_id}/ledger")
                    if res.status_code == 200:
                        data = res.json()
                        settlements = data.get("simplified_settlements", [])
                        net_balances = data.get("net_balances_cents", {})

                        msg = f"📊 *TripSheriff Ledger — {data.get('trip_id', trip_id)}*\n\n"
                        msg += "*Net Balances:*\n"
                        for uid, cents in net_balances.items():
                            sign = "+" if cents >= 0 else "-"
                            msg += f"• `{uid}`: {sign}${abs(cents)/100:.2f}\n"

                        msg += "\n*Simplified Settlements:*\n"
                        if not settlements:
                            msg += "🎉 All debts settled! Net balance is zero.\n"
                        for s in settlements:
                            msg += f"• *{s.get('from_user_id')}* owes *{s.get('to_user_id')}*: `${s.get('amount_cents', 0)/100:.2f}`\n"

                        msg += f"\n📊 *View AG Grid Dashboard:*\n{settings.WEB_SIMULATOR_URL}"
                        await cls.send_text_message(from_phone, msg)
                        return {"action": "BALANCE", "source": "backend", "reply": msg}
            except Exception:
                pass

            # Fallback simulated balance
            msg = (
                "📊 *TripSheriff Simulated Ledger — Bali 2026*\n\n"
                "*Members & Net Balances:*\n"
                "• Sarah Chen (@sarah_c): `+$160.00` (Fronted Villa)\n"
                "• Alex Rivera (@alex_travels): `-$80.00` (Overdue | Heat: 75/100 🔥)\n"
                "• Dave Kim (@dave_k): `-$80.00` (Pending)\n\n"
                "*Optimal Settlement Plan:*\n"
                "• Alex owes Sarah: *$80.00*\n"
                "• Dave owes Sarah: *$80.00*\n\n"
                "💳 *Pay Alex's Share via PayPal:*\n"
                "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T\n\n"
                f"📊 *View AG Grid:* {settings.WEB_SIMULATOR_URL}"
            )
            await cls.send_text_message(from_phone, msg)
            return {"action": "BALANCE", "source": "simulated", "reply": msg}

        elif normalized.startswith(("/sim_time", "!sim_time")):
            raw_val = text.replace("/sim_time", "").replace("!sim_time", "").replace("+", "").replace("h", "").strip()
            hours = int(raw_val) if raw_val.isdigit() else 24

            trip = _WA_TRIPS["trip_bali_2026"]
            trip["hours_advanced"] = trip.get("hours_advanced", 0) + hours
            total_hours = trip["hours_advanced"]

            loop_req = AgentLoopRequest(
                trip_id="trip_bali_2026",
                overdue_debts=[
                    DebtEntry(
                        debtor_id="user_02",
                        debtor_name="Alex",
                        debtor_handle="@alex_travels",
                        creditor_name="Sarah",
                        amount_cents=8000,
                        expense_description="Sunset Villa Deposit",
                        hours_overdue=float(total_hours),
                        reminders_sent=max(0, total_hours // 24),
                        roast_consent="SPICY",
                        paypal_checkout_url="https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
                    )
                ],
                sim_mode=True,
            )
            loop_resp = await AgentLoopService.run_loop(loop_req)
            heat = loop_resp.heat_scores[0] if loop_resp.heat_scores else None
            tier_name = heat.recommended_tier if heat else "POLITE_CONCIERGE"
            score = heat.score if heat else 50

            reply = (
                f"⏰ *Fast-Forwarded Time by +{hours}h!* (Total debt age: `{total_hours}h`)\n\n"
                f"• *Debtor:* Alex Rivera (`@alex_travels`)\n"
                f"• *Debt Heat Score:* `{score}/100` 🔥\n"
                f"• *Escalation Tier:* `{tier_name}`\n\n"
                f"Type `/roast` to trigger the escalated collection summon!"
            )
            await cls.send_text_message(from_phone, reply)
            return {"action": "SIM_TIME", "hours": hours, "score": score, "tier": tier_name}

        elif normalized.startswith(("/help", "!help", "/start", "!start")):
            help_text = (
                "🤠 *Welcome to TripSheriff AI for WhatsApp!*\n\n"
                "I am your autonomous group treasury & debt collection sheriff.\n\n"
                "• *Log Expenses:* Type naturally: _'Paid $90 for seafood dinner split with @Sudhanva_k'_\n"
                "• *Send Receipt:* Drop a photo of any receipt to extract line items\n"
                "• `/balance` — View current ledger & simplified settlements\n"
                "• `/roast` — Generate escalating comedic WANTED meme card\n"
                "• `/sim_time +24h` — Advance debt clock to test escalation tiers"
            )
            await cls.send_text_message(from_phone, help_text)
            return {"action": "HELP", "reply": help_text}

        # -------------------------------------------------------------
        # 2. Multimodal Receipt OCR (Image Handling)
        # -------------------------------------------------------------
        if message_type == "image":
            image_bytes = media_bytes
            if not image_bytes and media_id:
                image_bytes = await cls.download_media_bytes(media_id)

            if image_bytes:
                ocr_response = await ReceiptVisionService.parse_image_bytes(
                    image_bytes,
                    mime_type="image/jpeg",
                    currency="USD",
                )
                curr_sym = ocr_response.currency_symbol or "$"
                total_fmt = f"{curr_sym}{ocr_response.total_cents / 100:.2f}"

                reply = (
                    f"🧾 *Extracted Receipt — {ocr_response.merchant}*\n\n"
                    f"• *Date:* {ocr_response.date or 'Today'}\n"
                    f"• *Total Bill:* `{total_fmt}`\n"
                    f"• *Tax / Tip:* `{curr_sym}{ocr_response.tax_cents/100:.2f}` / `{curr_sym}{ocr_response.tip_cents/100:.2f}`\n\n"
                    f"*Line Items ({len(ocr_response.items)}):*\n"
                )
                for item in ocr_response.items[:6]:
                    reply += f"• {item.name} (x{item.qty}): `{curr_sym}{item.price_cents / 100:.2f}`\n"

                reply += (
                    f"\n💳 *Settle Share via PayPal:*\n"
                    f"https://www.sandbox.paypal.com/checkoutnow?token=SIM_RECEIPT_{ocr_response.total_cents}\n\n"
                    f"📊 *Claim in Web Portal:* {settings.WEB_SIMULATOR_URL}"
                )
                await cls.send_text_message(from_phone, reply)
                return {"action": "RECEIPT_OCR", "merchant": ocr_response.merchant, "total_cents": ocr_response.total_cents}

        # -------------------------------------------------------------
        # 3. Natural Language Expense Parsing (NLP Routing)
        # -------------------------------------------------------------
        if text:
            # Dynamically build active members
            active_members = [
                MemberSummary(user_id=profile["user_id"], name=profile["name"], handle=profile.get("handle")),
                MemberSummary(user_id="user_01", name="Sarah", handle="@sarah_c"),
                MemberSummary(user_id="user_02", name="Alex", handle="@alex_travels"),
                MemberSummary(user_id="user_03", name="Dave", handle="@dave_k"),
            ]
            # Scan for @handles mentioned in text
            for handle in re.findall(r"@([a-zA-Z0-9_]+)", text):
                handle_with_at = f"@{handle}"
                if not any(m.handle and m.handle.lower() == handle_with_at.lower() for m in active_members):
                    active_members.append(
                        MemberSummary(
                            user_id=f"wa_{handle.lower()}",
                            name=handle,
                            handle=handle_with_at,
                        )
                    )

            decide_req = AgentDecideRequest(
                trip_id="trip_bali_2026",
                sender_id=profile["user_id"],
                sender_name=profile["name"],
                message_text=text,
                active_members=active_members,
            )

            decision = await AgentRouterService.decide_intent(decide_req)

            if decision.action == "LOG_EXPENSE" and decision.parsed_data:
                parsed = decision.parsed_data
                amount_dollars = parsed.amount_cents / 100
                split_count = len(parsed.split_with_user_ids) or 2
                per_person = amount_dollars / split_count

                reply = (
                    f"🍽️ *TripSheriff Logged Expense!*\n\n"
                    f"• *Description:* {parsed.description}\n"
                    f"• *Total Amount:* ${amount_dollars:.2f}\n"
                    f"• *Paid by:* {profile['name']}\n"
                    f"• *Split ({split_count} ways):* ${per_person:.2f} each\n\n"
                    f"💳 *1-Tap Settlement Links:*\n"
                )

                for uid in parsed.split_with_user_ids:
                    if uid != parsed.payer_id:
                        name_label = uid
                        for m in active_members:
                            if m.user_id == uid:
                                name_label = m.name or (m.handle or uid)
                                break
                        reply += (
                            f"• *{name_label}* (${per_person:.2f}):\n"
                            f"  https://www.sandbox.paypal.com/checkoutnow?token=SIM_{uid}_{int(parsed.amount_cents)}\n"
                        )

                reply += f"\n📊 *View AG Grid Ledger:* {settings.WEB_SIMULATOR_URL}"
                await cls.send_text_message(from_phone, reply)
                return {"action": "LOG_EXPENSE", "parsed": parsed.model_dump(), "reply": reply}

            elif decision.action in ["CHECK_BALANCES", "DISPUTE_OR_PAUSE"]:
                await cls.send_text_message(from_phone, decision.reply_text)
                return {"action": decision.action, "reply": decision.reply_text}

        return {"action": "IGNORED", "reason": "No actionable text or media"}
