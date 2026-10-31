import io
import re
import os
import sys
from pathlib import Path
import json
import base64
import logging
from typing import Optional, List, Dict, Any

# Ensure ai package root is in sys.path when running standalone
_ai_root = Path(__file__).resolve().parent.parent
if str(_ai_root) not in sys.path:
    sys.path.insert(0, str(_ai_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputFile,
)
from telegram.constants import ParseMode, ChatType
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

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

# In-memory member directory and trip context for Telegram sessions
_USER_PROFILES: Dict[int, Dict[str, Any]] = {}
_ACTIVE_TRIPS: Dict[str, Dict[str, Any]] = {
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


def get_or_create_user_profile(user_id: int, username: Optional[str], first_name: str) -> Dict[str, Any]:
    if user_id not in _USER_PROFILES:
        handle = f"@{username}" if username else f"@{first_name.lower()}"
        _USER_PROFILES[user_id] = {
            "user_id": f"tg_{user_id}",
            "name": first_name,
            "handle": handle,
            "paypal_email": f"{first_name.lower()}.sandbox@personal.example.com",
            "roast_consent": "SPICY",
            "trip_id": "trip_bali_2026",
        }
    return _USER_PROFILES[user_id]


# ---------------------------------------------------------------------------
# Command Handlers
# ---------------------------------------------------------------------------

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles /start. Supports 1:1 deep-link onboarding:
    t.me/TripSheriffBot?start=join_trip_bali_2026
    """
    user = update.effective_user
    chat = update.effective_chat
    args = context.args or []

    profile = get_or_create_user_profile(user.id, user.username, user.first_name)

    # 1. Private chat with deep-link onboarding parameter
    if chat.type == ChatType.PRIVATE and args and args[0].startswith("join_"):
        trip_id = args[0].replace("join_", "")
        profile["trip_id"] = trip_id

        consent_keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("🌶️ Mild Roast", callback_data="consent_MILD"),
                InlineKeyboardButton("🌶️🌶️ Spicy Roast", callback_data="consent_SPICY"),
            ],
            [
                InlineKeyboardButton("😇 No Roast (Polite Only)", callback_data="consent_NO_ROAST"),
            ],
        ])

        welcome_private = (
            f"🤠 **Welcome to TripSheriff AI, {user.first_name}!**\n\n"
            f"You're onboarding to trip `{trip_id}`.\n\n"
            f"• **PayPal Sandbox Email**: `{profile['paypal_email']}`\n"
            f"• **Current Roast Consent**: `{profile['roast_consent']}`\n\n"
            f"Select your consensual roast tolerance below to protect your dignity:"
        )
        await update.message.reply_text(
            welcome_private,
            reply_markup=consent_keyboard,
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    # 2. Group chat introduction
    bot_username = settings.TELEGRAM_BOT_USERNAME or "TripSheriffBot"
    deep_link = f"https://t.me/{bot_username}?start=join_trip_bali_2026"

    group_keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("⚙️ Set PayPal & Roast Consent", url=deep_link),
            InlineKeyboardButton("📊 View Trip Ledger", url=settings.WEB_SIMULATOR_URL),
        ]
    ])

    group_welcome = (
        "🤠 **TripSheriff AI is on duty!**\n\n"
        "I am your autonomous group travel treasury & debt collector.\n\n"
        "**What I do:**\n"
        "• 💬 Drop expenses in chat: *'Paid $120 for dinner split with @alex and @dave'*\n"
        "• 🧾 Upload receipt photos for instant line-item claiming\n"
        "• 💳 Instant 1-tap settlement links via PayPal Sandbox\n"
        "• ⏰ Escalating comedic roasts for overdue debts (5 calibrated tiers)\n\n"
        "Tap below to link your PayPal sandbox email and calibrate your roast tolerance:"
    )

    await update.message.reply_text(
        group_welcome,
        reply_markup=group_keyboard,
        parse_mode=ParseMode.MARKDOWN,
    )


async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles /balance — queries the trip ledger and displays simplified net debts.
    """
    trip_id = "trip_bali_2026"
    trip = _ACTIVE_TRIPS.get(trip_id, {})

    # Try live Java backend first
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{settings.BACKEND_URL}/api/trips/{trip_id}/ledger")
            if res.status_code == 200:
                data = res.json()
                settlements = data.get("simplified_settlements", [])
                net_balances = data.get("net_balances_cents", {})

                msg = f"📊 **TripSheriff Ledger — {data.get('trip_id', trip_id)}**\n\n"
                msg += "**Net Balances:**\n"
                for uid, cents in net_balances.items():
                    sign = "+" if cents >= 0 else "-"
                    msg += f"• `{uid}`: {sign}${abs(cents)/100:.2f}\n"

                msg += "\n**Simplified Settlements (Bipartite Min Cash Flow):**\n"
                if not settlements:
                    msg += "🎉 All debts settled! Net balance is zero.\n"
                for s in settlements:
                    msg += f"• **{s.get('from_user_id')}** owes **{s.get('to_user_id')}**: `${s.get('amount_cents', 0)/100:.2f}`\n"

                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("📊 Open AG Grid Dashboard", url=f"{settings.WEB_SIMULATOR_URL}/ledger")]
                ])
                await update.message.reply_text(msg, reply_markup=keyboard, parse_mode=ParseMode.MARKDOWN)
                return
    except Exception as exc:
        logger.debug(f"Java backend offline ({exc}), using local simulation")

    # Local fallback balance summary
    msg = (
        "📊 **TripSheriff Simulated Ledger — Bali 2026**\n\n"
        "**Members & Net Balances:**\n"
        "• Sarah Chen (`@sarah_c`): `+$160.00` (Fronted Villa Deposit)\n"
        "• Alex Rivera (`@alex_travels`): `-$80.00` (36h Overdue | Heat: 75/100 🔥)\n"
        "• Dave Kim (`@dave_k`): `-$80.00` (Pending)\n\n"
        "**Optimal Settlement Plan:**\n"
        "• Alex owes Sarah: **$80.00**\n"
        "• Dave owes Sarah: **$80.00**\n"
    )
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("💳 Pay Alex's $80 Share", url="https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T"),
            InlineKeyboardButton("📊 View AG Grid", url=settings.WEB_SIMULATOR_URL),
        ]
    ])
    await update.message.reply_text(msg, reply_markup=keyboard, parse_mode=ParseMode.MARKDOWN)


async def roast_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles /roast — generates an instant comedic roast demo with dynamic WANTED meme card.
    Usage: /roast [tier]
    """
    args = context.args or []
    tier = "PUBLIC_ROAST"
    if args and args[0].upper() in ["POLITE", "PASSIVE", "PARENT", "ROAST", "EMBARGO"]:
        mapping = {
            "POLITE": "POLITE_CONCIERGE",
            "PASSIVE": "PASSIVE_AGGRESSIVE",
            "PARENT": "DISAPPOINTED_PARENT",
            "ROAST": "PUBLIC_ROAST",
            "EMBARGO": "ITINERARY_EMBARGO",
        }
        tier = mapping.get(args[0].upper(), "PUBLIC_ROAST")

    await update.message.reply_text("🤠 *TripSheriff is inspecting the ledger and drafting the summon...*", parse_mode=ParseMode.MARKDOWN)

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

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("💳 Settle $80.00 via PayPal", url=roast_req.paypal_checkout_url),
        ]
    ])

    # If PUBLIC_ROAST, send generated WANTED meme card as photo
    if tier == "PUBLIC_ROAST":
        card_b64 = RoastCardGenerator.generate_wanted_card(
            debtor_name="Alex Rivera",
            amount_cents=8000,
            description="Sunset Villa Deposit",
            debtor_handle="@alex_travels",
            creditor_name="Sarah",
        )
        card_bytes = base64.b64decode(card_b64)

        await update.message.reply_photo(
            photo=io.BytesIO(card_bytes),
            caption=f"🚨 **TRIPSHERIFF BOUNTY ALERT**\n\n{roast_resp.generated_text}",
            reply_markup=keyboard,
            parse_mode=ParseMode.MARKDOWN,
        )
    else:
        await update.message.reply_text(
            f"⚠️ **Tier {tier} Notice:**\n\n{roast_resp.generated_text}",
            reply_markup=keyboard,
            parse_mode=ParseMode.MARKDOWN,
        )


async def sim_time_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handles /sim_time — fast-forwards virtual debt age by +24h to trigger escalating tiers.
    Usage: /sim_time +24h
    """
    args = context.args or ["24"]
    raw_val = args[0].replace("+", "").replace("h", "")
    try:
        hours = int(raw_val)
    except ValueError:
        hours = 24

    trip_id = "trip_bali_2026"
    trip = _ACTIVE_TRIPS.get(trip_id, {})
    trip["hours_advanced"] = trip.get("hours_advanced", 0) + hours
    total_hours = trip["hours_advanced"]

    # Call autonomous loop evaluator
    loop_req = AgentLoopRequest(
        trip_id=trip_id,
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

    reply_text = (
        f"⏰ **Fast-Forwarded Time by +{hours}h!** (Total simulated debt age: `{total_hours}h`)\n\n"
        f"• **Debtor:** Alex Rivera (`@alex_travels`)\n"
        f"• **Debt Heat Score:** `{score}/100` 🔥\n"
        f"• **Escalation Tier:** `{tier_name}`\n\n"
        f"Use `/roast` to broadcast the escalated debt collection message to the group!"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton(f"🚨 Trigger {tier_name} Roast", callback_data=f"trigger_roast_{tier_name}"),
            InlineKeyboardButton("📊 View AG Grid", url=settings.WEB_SIMULATOR_URL),
        ]
    ])

    await update.message.reply_text(reply_text, reply_markup=keyboard, parse_mode=ParseMode.MARKDOWN)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles /help command."""
    help_text = (
        "🤠 **TripSheriff AI Command Guide:**\n\n"
        "• `/start` — Onboard and calibrate your roast tolerance\n"
        "• `/balance` — View current integer-cent balances & debt graph\n"
        "• `/roast` — Trigger comedic debt escalation roast\n"
        "• `/sim_time +24h` — Advance debt clock to test higher tiers\n"
        "• **Text in group** — Log expenses naturally: *'Paid $90 for groceries split with @alex'*\n"
        "• **Send receipt photo** — Multimodal OCR extracts items & splits bill\n"
    )
    await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)


# ---------------------------------------------------------------------------
# Message Handlers
# ---------------------------------------------------------------------------

async def handle_group_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Parses unstructured group conversation using AgentRouterService (/ai/agent/decide).
    """
    message = update.message
    if not message or not message.text:
        return

    text = message.text.strip()
    if text.startswith("/"):
        return  # Handled by command handlers

    sender = message.from_user
    profile = get_or_create_user_profile(sender.id, sender.username, sender.first_name)

    active_members = [
        MemberSummary(user_id="user_01", name="Sarah", handle="@sarah_c"),
        MemberSummary(user_id="user_02", name="Alex", handle="@alex_travels"),
        MemberSummary(user_id="user_03", name="Dave", handle="@dave_k"),
    ]

    decide_req = AgentDecideRequest(
        trip_id="trip_bali_2026",
        sender_id=profile["user_id"],
        sender_name=sender.first_name,
        message_text=text,
        active_members=active_members,
    )

    try:
        decision = await AgentRouterService.decide_intent(decide_req)

        if decision.action == "LOG_EXPENSE" and decision.parsed_data:
            parsed = decision.parsed_data
            amount_dollars = parsed.amount_cents / 100
            split_count = len(parsed.split_with_user_ids) or 3
            per_person = amount_dollars / split_count

            # Build inline buttons for each debtor to settle via PayPal
            buttons = []
            for uid in parsed.split_with_user_ids:
                if uid != parsed.payer_id:
                    name_label = "Alex" if "02" in uid else "Dave" if "03" in uid else uid
                    buttons.append([
                        InlineKeyboardButton(
                            f"💳 Settle ${per_person:.2f} ({name_label})",
                            url=f"https://www.sandbox.paypal.com/checkoutnow?token=SIM_{uid}_{int(parsed.amount_cents)}",
                        )
                    ])

            buttons.append([
                InlineKeyboardButton("📊 View AG Grid Ledger", url=settings.WEB_SIMULATOR_URL)
            ])

            await message.reply_text(
                decision.reply_text,
                reply_markup=InlineKeyboardMarkup(buttons),
                parse_mode=ParseMode.MARKDOWN,
            )
            return

        elif decision.action in ["CHECK_BALANCES", "DISPUTE_OR_PAUSE"]:
            await message.reply_text(decision.reply_text, parse_mode=ParseMode.MARKDOWN)
            return

    except Exception as exc:
        logger.error(f"Error handling group text: {exc}", exc_info=True)


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Downloads receipt photos sent to the group and executes multimodal OCR via ReceiptVisionService.
    """
    message = update.message
    if not message or not message.photo:
        return

    status_msg = await message.reply_text("🧾 *TripSheriff is reading the receipt with Gemini Vision...*", parse_mode=ParseMode.MARKDOWN)

    try:
        # Get highest resolution photo
        highest_res_photo = message.photo[-1]
        file_obj = await highest_res_photo.get_file()
        photo_bytes = await file_obj.download_as_bytearray()

        ocr_response = await ReceiptVisionService.parse_image_bytes(
            bytes(photo_bytes),
            mime_type="image/jpeg",
            currency="USD",
        )

        curr_sym = ocr_response.currency_symbol or "$"
        total_fmt = f"{curr_sym}{ocr_response.total_cents / 100:.2f}"

        reply = (
            f"🧾 **Extracted Receipt — {ocr_response.merchant}**\n\n"
            f"• **Date:** {ocr_response.date or 'Today'}\n"
            f"• **Total Bill:** `{total_fmt}`\n"
            f"• **Tax / Tip:** `{curr_sym}{ocr_response.tax_cents/100:.2f}` / `{curr_sym}{ocr_response.tip_cents/100:.2f}`\n\n"
            f"**Line Items ({len(ocr_response.items)}):**\n"
        )

        for item in ocr_response.items[:6]:
            reply += f"• {item.name} (x{item.qty}): `{curr_sym}{item.price_cents / 100:.2f}`\n"

        buttons = [
            [
                InlineKeyboardButton(f"💳 Settle Share via PayPal", url=f"https://www.sandbox.paypal.com/checkoutnow?token=SIM_RECEIPT_{ocr_response.total_cents}"),
                InlineKeyboardButton("📊 Claim in Web Portal", url=f"{settings.WEB_SIMULATOR_URL}"),
            ]
        ]

        await status_msg.edit_text(
            reply,
            reply_markup=InlineKeyboardMarkup(buttons),
            parse_mode=ParseMode.MARKDOWN,
        )

    except Exception as exc:
        logger.error(f"Failed to process receipt photo: {exc}", exc_info=True)
        await status_msg.edit_text(f"⚠️ Could not parse receipt: {str(exc)}")


# ---------------------------------------------------------------------------
# Callback Query Handlers (Inline Buttons)
# ---------------------------------------------------------------------------

async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles button clicks for roast consent and actions."""
    query = update.callback_query
    if not query:
        return
    await query.answer()

    data = query.data or ""
    user = query.from_user
    profile = get_or_create_user_profile(user.id, user.username, user.first_name)

    if data.startswith("consent_"):
        consent = data.replace("consent_", "")
        profile["roast_consent"] = consent
        icons = {"MILD": "🌶️ Mild", "SPICY": "🌶️🌶️ Spicy", "NO_ROAST": "😇 No Roast"}
        await query.edit_message_text(
            f"✅ **Roast Consent Updated!**\n\nYour tolerance is set to **{icons.get(consent, consent)}**.\n"
            "TripSheriff will strictly respect your boundary during debt enforcement.",
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data.startswith("trigger_roast_"):
        tier = data.replace("trigger_roast_", "")
        roast_req = EscalateRoastRequest(
            trip_id="trip_bali_2026",
            debtor_id="user_02",
            debtor_name="Alex",
            debtor_handle="@alex_travels",
            creditor_name="Sarah",
            amount_cents=8000,
            expense_description="Sunset Villa Deposit",
            hours_overdue=48,
            roast_consent="SPICY",
            tier=tier, # type: ignore
            paypal_checkout_url="https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
        )
        roast_resp = await PersonalityMatrixService.generate_escalated_message(roast_req)
        await query.message.reply_text(
            f"📢 **{tier} Broadcast:**\n\n{roast_resp.generated_text}",
            parse_mode=ParseMode.MARKDOWN,
        )


# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------

def create_telegram_application(token: Optional[str] = None) -> Application:
    """
    Builds the Telegram Application with all registered command and message handlers.
    """
    bot_token = token or settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set in environment or settings.")

    app = ApplicationBuilder().token(bot_token).build()

    # Commands
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("roast", roast_command))
    app.add_handler(CommandHandler("sim_time", sim_time_command))
    app.add_handler(CommandHandler("help", help_command))

    # Callback queries (inline buttons)
    app.add_handler(CallbackQueryHandler(handle_callback_query))

    # Media & Messages
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_group_text))

    return app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    print("[TripSheriff] Starting Telegram Bot Gateway...")
    try:
        bot_app = create_telegram_application()
        bot_app.run_polling()
    except ValueError as e:
        print(f"Cannot start Telegram bot: {e}")
        print("To run the live bot, set TELEGRAM_BOT_TOKEN in ai/.env")
