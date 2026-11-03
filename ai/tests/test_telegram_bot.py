import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import io
import base64

from telegram.constants import ChatType
from core.schemas import (
    AgentDecideResponse,
    ParsedExpenseData,
    EscalateRoastResponse,
    ReceiptParseResponse,
    ReceiptItem,
    AgentLoopResponse,
    DebtHeatScore,
)
from gateway.telegram_bot import (
    get_or_create_user_profile,
    start_command,
    balance_command,
    roast_command,
    sim_time_command,
    help_command,
    handle_group_text,
    handle_photo,
    handle_callback_query,
    create_telegram_application,
    _USER_PROFILES,
    _ACTIVE_TRIPS,
)


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    _USER_PROFILES.clear()
    _ACTIVE_TRIPS["trip_bali_2026"]["hours_advanced"] = 0
    yield
    _USER_PROFILES.clear()
    _ACTIVE_TRIPS["trip_bali_2026"]["hours_advanced"] = 0


def create_mock_update_and_context(
    chat_type: str = ChatType.GROUP,
    user_id: int = 12345,
    first_name: str = "Alice",
    username: str = "alice_w",
    args: list = None,
    text: str = None,
):
    update = MagicMock()
    context = MagicMock()
    context.args = args or []

    user = MagicMock()
    user.id = user_id
    user.first_name = first_name
    user.username = username

    chat = MagicMock()
    chat.id = 99999
    chat.type = chat_type

    message = MagicMock()
    message.from_user = user
    message.text = text
    message.reply_text = AsyncMock()
    message.reply_photo = AsyncMock()

    update.effective_user = user
    update.effective_chat = chat
    update.message = message
    update.callback_query = None

    return update, context


def test_get_or_create_user_profile():
    profile = get_or_create_user_profile(user_id=101, username="test_user", first_name="Test")
    assert profile["user_id"] == "tg_101"
    assert profile["handle"] == "@test_user"
    assert profile["roast_consent"] == "SPICY"
    assert "paypal_email" in profile

    # Idempotent retrieval
    profile_again = get_or_create_user_profile(user_id=101, username="test_user", first_name="Test")
    assert profile is profile_again


@pytest.mark.asyncio
async def test_start_command_private_deep_link():
    update, context = create_mock_update_and_context(
        chat_type=ChatType.PRIVATE,
        args=["join_trip_bali_2026"],
    )

    await start_command(update, context)

    update.message.reply_text.assert_awaited_once()
    reply_call = update.message.reply_text.await_args
    text = reply_call[0][0]
    markup = reply_call[1]["reply_markup"]

    assert "trip_bali_2026" in text
    assert "Roast Consent" in text
    # Check inline keyboard buttons
    buttons = [btn.callback_data for row in markup.inline_keyboard for btn in row]
    assert "consent_MILD" in buttons
    assert "consent_SPICY" in buttons
    assert "consent_NO_ROAST" in buttons


@pytest.mark.asyncio
async def test_start_command_group():
    update, context = create_mock_update_and_context(
        chat_type=ChatType.GROUP,
        args=[],
    )

    await start_command(update, context)

    update.message.reply_text.assert_awaited_once()
    reply_call = update.message.reply_text.await_args
    text = reply_call[0][0]
    markup = reply_call[1]["reply_markup"]

    assert "TripSheriff AI is on duty!" in text
    urls = [btn.url for row in markup.inline_keyboard for btn in row if btn.url]
    assert any("start=join_trip_bali_2026" in u for u in urls)


@pytest.mark.asyncio
async def test_balance_command_fallback():
    update, context = create_mock_update_and_context()

    # Backend is offline during this test, triggering fallback
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        await balance_command(update, context)

    update.message.reply_text.assert_awaited_once()
    text = update.message.reply_text.await_args[0][0]
    assert "Simulated Ledger" in text
    assert "Sarah Chen" in text
    assert "$80.00" in text


@pytest.mark.asyncio
async def test_balance_command_backend_success():
    update, context = create_mock_update_and_context()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "trip_id": "trip_bali_2026",
        "net_balances_cents": {"user_01": 12000, "user_02": -12000},
        "simplified_settlements": [
            {"from_user_id": "user_02", "to_user_id": "user_01", "amount_cents": 12000}
        ],
    }

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        await balance_command(update, context)

    update.message.reply_text.assert_awaited_once()
    text = update.message.reply_text.await_args[0][0]
    assert "user_02" in text
    assert "$120.00" in text


@pytest.mark.asyncio
async def test_roast_command_public_roast():
    update, context = create_mock_update_and_context(args=["ROAST"])

    mock_roast_resp = EscalateRoastResponse(
        generated_text="Alex, your debt is older than the ruins of Bali.",
        tier="PUBLIC_ROAST",
    )

    with patch("gateway.telegram_bot.PersonalityMatrixService.generate_escalated_message", return_value=mock_roast_resp), \
         patch("gateway.telegram_bot.RoastCardGenerator.generate_wanted_card", return_value=base64.b64encode(b"fake_image_bytes").decode("utf-8")):
        await roast_command(update, context)

    # 1st call is "drafting the summon...", 2nd call is reply_photo
    update.message.reply_text.assert_awaited_once()
    update.message.reply_photo.assert_awaited_once()

    photo_call = update.message.reply_photo.await_args
    assert "TRIPSHERIFF BOUNTY ALERT" in photo_call[1]["caption"]
    assert "older than the ruins of Bali" in photo_call[1]["caption"]


@pytest.mark.asyncio
async def test_roast_command_polite():
    update, context = create_mock_update_and_context(args=["POLITE"])

    mock_roast_resp = EscalateRoastResponse(
        generated_text="Friendly reminder regarding your share of the Sunset Villa Deposit.",
        tier="POLITE_CONCIERGE",
    )

    with patch("gateway.telegram_bot.PersonalityMatrixService.generate_escalated_message", return_value=mock_roast_resp):
        await roast_command(update, context)

    # 1st call is "drafting...", 2nd call is reply_text with Polite notice
    assert update.message.reply_text.await_count == 2
    second_text = update.message.reply_text.await_args_list[1][0][0]
    assert "Tier POLITE_CONCIERGE Notice" in second_text


@pytest.mark.asyncio
async def test_sim_time_command():
    update, context = create_mock_update_and_context(args=["+48h"])

    mock_loop_resp = AgentLoopResponse(
        trip_id="trip_bali_2026",
        debts_evaluated=1,
        actions_taken=1,
        heat_scores=[
            DebtHeatScore(
                debtor_id="user_02",
                score=78,
                recommended_tier="DISAPPOINTED_PARENT",
                action="SEND_REMINDER",
                reason="Overdue for 48 hours",
            )
        ],
        tool_decisions=[],
        summary_text="1 action taken",
    )

    with patch("gateway.telegram_bot.AgentLoopService.run_loop", return_value=mock_loop_resp):
        await sim_time_command(update, context)

    update.message.reply_text.assert_awaited_once()
    text = update.message.reply_text.await_args[0][0]
    markup = update.message.reply_text.await_args[1]["reply_markup"]

    assert "Fast-Forwarded Time by +48h" in text
    assert "78/100" in text
    assert "DISAPPOINTED_PARENT" in text
    btn = markup.inline_keyboard[0][0]
    assert btn.callback_data == "trigger_roast_DISAPPOINTED_PARENT"


@pytest.mark.asyncio
async def test_handle_group_text_expense():
    update, context = create_mock_update_and_context(text="Paid $90 for groceries split with @alex and @dave")

    mock_decision = AgentDecideResponse(
        trip_id="trip_bali_2026",
        action="LOG_EXPENSE",
        confidence=0.95,
        reply_text="Got it! Logged $90 for groceries split 3 ways.",
        parsed_data=ParsedExpenseData(
            payer_id="tg_12345",
            amount_cents=9000,
            currency="USD",
            description="groceries",
            split_with_user_ids=["tg_12345", "user_02", "user_03"],
        ),
    )

    with patch("gateway.telegram_bot.AgentRouterService.decide_intent", return_value=mock_decision):
        await handle_group_text(update, context)

    update.message.reply_text.assert_awaited_once()
    reply_call = update.message.reply_text.await_args
    assert "Logged $90 for groceries" in reply_call[0][0]
    markup = reply_call[1]["reply_markup"]
    # Check settlement buttons for Alex and Dave
    button_labels = [btn.text for row in markup.inline_keyboard for btn in row]
    assert any("Settle $30.00 (Alex)" in label for label in button_labels)
    assert any("Settle $30.00 (Dave)" in label for label in button_labels)


@pytest.mark.asyncio
async def test_handle_photo_receipt():
    update, context = create_mock_update_and_context()

    status_msg = MagicMock()
    status_msg.edit_text = AsyncMock()
    update.message.reply_text.return_value = status_msg

    # Mock photo array and file download
    photo_mock = MagicMock()
    file_mock = MagicMock()
    file_mock.download_as_bytearray = AsyncMock(return_value=bytearray(b"fake_jpeg_content"))
    photo_mock.get_file = AsyncMock(return_value=file_mock)
    update.message.photo = [photo_mock]

    mock_ocr = ReceiptParseResponse(
        status="SUCCESS",
        merchant="Warung Bali",
        date="2026-10-31",
        currency="USD",
        currency_symbol="$",
        subtotal_cents=4500,
        tax_cents=500,
        tip_cents=0,
        total_cents=5000,
        items=[
            ReceiptItem(name="Nasi Goreng", qty=2, price_cents=3000),
            ReceiptItem(name="Fresh Coconut", qty=2, price_cents=1500),
        ],
        suggested_reply="Parsed receipt",
    )

    with patch("gateway.telegram_bot.ReceiptVisionService.parse_image_bytes", return_value=mock_ocr):
        await handle_photo(update, context)

    update.message.reply_text.assert_awaited_once_with(
        "🧾 *TripSheriff is reading the receipt with Gemini Vision...*",
        parse_mode="Markdown",
    )
    status_msg.edit_text.assert_awaited_once()
    call_text = status_msg.edit_text.await_args[0][0]
    assert "Warung Bali" in call_text
    assert "$50.00" in call_text
    assert "Nasi Goreng" in call_text


@pytest.mark.asyncio
async def test_handle_callback_query_consent():
    update = MagicMock()
    context = MagicMock()

    user = MagicMock()
    user.id = 555
    user.first_name = "Charlie"
    user.username = "charlie"

    query = MagicMock()
    query.from_user = user
    query.data = "consent_MILD"
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()

    update.callback_query = query

    await handle_callback_query(update, context)

    query.answer.assert_awaited_once()
    query.edit_message_text.assert_awaited_once()
    call_text = query.edit_message_text.await_args[0][0]
    assert "Roast Consent Updated!" in call_text
    assert "Mild" in call_text

    # Verify user profile in state
    profile = get_or_create_user_profile(555, "charlie", "Charlie")
    assert profile["roast_consent"] == "MILD"


def test_create_telegram_application_no_token():
    with patch("gateway.telegram_bot.settings.TELEGRAM_BOT_TOKEN", ""):
        with pytest.raises(ValueError, match="TELEGRAM_BOT_TOKEN is not set"):
            create_telegram_application(token=None)


def test_create_telegram_application_with_token():
    with patch("gateway.telegram_bot.ApplicationBuilder") as mock_builder:
        mock_inst = MagicMock()
        mock_builder.return_value.token.return_value.build.return_value = mock_inst

        app = create_telegram_application(token="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        assert app is mock_inst
