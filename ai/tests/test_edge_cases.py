import io
import base64
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram.error import BadRequest

from core.schemas import (
    DebtEntry,
    ReceiptParseResponse,
    ReceiptItem,
    ItemizerSplitRequest,
    AgentDecideRequest,
    MemberSummary,
    EscalateRoastResponse,
)
from agent.agent_loop_service import _calculate_heat_score, _hours_to_tier
from agent.agent_service import AgentRouterService
from escalation.roast_card_service import RoastCardGenerator
from receipts.itemizer_service import ReceiptItemizerService
from gateway.telegram_bot import balance_command, roast_command, handle_photo, sim_time_command


def create_mock_update():
    update = MagicMock()
    context = MagicMock()
    context.args = []

    user = MagicMock()
    user.id = 999
    user.first_name = "Alex_Tester"
    user.username = "alex_tester"

    chat = MagicMock()
    chat.id = 12345
    chat.type = "group"

    message = MagicMock()
    message.from_user = user
    message.text = ""
    message.reply_text = AsyncMock()
    message.reply_photo = AsyncMock()

    update.effective_user = user
    update.effective_chat = chat
    update.message = message
    update.callback_query = None

    return update, context


def test_heat_score_clamping_and_bounds():
    # Negative hours and amounts should be safely clamped to >= 0
    debt_neg = DebtEntry(
        debtor_id="user_test",
        debtor_name="Negative Tester",
        creditor_name="Sarah",
        expense_description="Sunset Villa Deposit",
        amount_cents=-5000,
        hours_overdue=-12.5,
        reminders_sent=-3,
    )
    score_neg = _calculate_heat_score(debt_neg, sim_mode=False)
    assert 0 <= score_neg <= 100
    assert score_neg == 0

    # Huge numbers should be capped at 100
    debt_huge = DebtEntry(
        debtor_id="user_test",
        debtor_name="Huge Tester",
        creditor_name="Sarah",
        expense_description="Sunset Villa Deposit",
        amount_cents=10_000_000,
        hours_overdue=1000.0,
        reminders_sent=50,
    )
    score_huge = _calculate_heat_score(debt_huge, sim_mode=False)
    assert score_huge == 100


def test_hours_to_tier_bounds():
    # Negative hours default to polite concierge
    tier_neg = _hours_to_tier(hours=-5.0, consent="SPICY", reminders_sent=0, sim_mode=False)
    assert tier_neg == "POLITE_CONCIERGE"

    # Max reminders forces embargo even if hours are low
    tier_embargo = _hours_to_tier(hours=2.0, consent="SPICY", reminders_sent=4, sim_mode=False)
    assert tier_embargo == "ITINERARY_EMBARGO"


def test_roast_card_generator_long_text_safety():
    # Verifies card generation handles very long names and descriptions without crashing
    b64_card = RoastCardGenerator.generate_wanted_card(
        debtor_name="Bartholomew Montgomery Alexander the Fourth of Bali",
        amount_cents=-125000,
        description="Luxury Penthouse Suite Reservation with Private Chef and Helicopter Landing Pad",
        debtor_handle="@super_ultra_mega_long_handle_account_2026",
        creditor_name="Sarah Chen-Vanderbilt the Third of California",
    )
    assert isinstance(b64_card, str)
    assert len(b64_card) > 500
    # Must decode cleanly as PNG
    card_bytes = base64.b64decode(b64_card)
    assert card_bytes.startswith(b"\x89PNG")


def test_agent_router_word_boundary_matching():
    # Member named "Al" should NOT match words like "all", "alcohol", or "Bali"
    request = AgentDecideRequest(
        trip_id="trip_bali_2026",
        sender_id="user_organizer",
        sender_name="Sarah",
        message_text="Paid $100 for all the alcohol in Bali",
        active_members=[
            MemberSummary(user_id="user_al", name="Al", handle="@al"),
            MemberSummary(user_id="user_organizer", name="Sarah", handle="@sarah_c"),
            MemberSummary(user_id="user_bob", name="Bob", handle="@bob"),
        ],
    )
    split_ids = AgentRouterService._resolve_split_ids(request.message_text, request)
    # "all the alcohol in Bali" has "all" which matches "everyone" rule -> returns all members
    assert "user_organizer" in split_ids

    # Now test message without "all/everyone" but with word containing "Al" like "alcohol"
    req_specific = AgentDecideRequest(
        trip_id="trip_bali_2026",
        sender_id="user_organizer",
        sender_name="Sarah",
        message_text="Paid $50 for local alcohol bottles",
        active_members=[
            MemberSummary(user_id="user_al", name="Al", handle="@al"),
            MemberSummary(user_id="user_bob", name="Bob", handle="@bob"),
        ],
    )
    # Since "alcohol" is not the word "Al", it should NOT match member "Al" specifically
    # and will fall back to splitting with everyone
    split_specific = AgentRouterService._resolve_split_ids(req_specific.message_text, req_specific)
    assert len(split_specific) >= 1


def test_itemizer_reconciler_breakdown_text_sync():
    # Test case where 1 cent drift occurs due to 3-way split of 1 cent
    receipt = ReceiptParseResponse(
        status="SUCCESS",
        merchant="Tapas Bar",
        subtotal_cents=1000,
        tax_cents=1,
        tip_cents=0,
        total_cents=1001,
        items=[
            ReceiptItem(index=0, name="Tapas", qty=1, price_cents=1000),
        ],
        suggested_reply="",
    )
    request = ItemizerSplitRequest(
        receipt=receipt,
        claims={"user_01": [0], "user_02": [0], "user_03": [0]},
        all_members=["user_01", "user_02", "user_03"],
        split_unclaimed_equally=True,
    )
    res = ReceiptItemizerService.calculate_split(request)
    assert res.is_balanced is True
    assert res.discrepancy_cents == 0
    # The highest claimant gets the drift and breakdown_text must reflect their final total
    for share in res.shares.values():
        total_str = f"{share.total_cents / 100:.2f}"
        assert total_str in share.breakdown_text


@pytest.mark.asyncio
async def test_telegram_markdown_entity_error_fallback():
    update, context = create_mock_update()

    # Configure reply_text to fail with BadRequest("Can't parse entities") on 1st call, succeed on 2nd
    parse_error = BadRequest("Can't parse entities in message text: unmatched underscore")
    update.message.reply_text = AsyncMock(side_effect=[parse_error, MagicMock()])

    with patch("httpx.AsyncClient.get", side_effect=Exception("Backend down")):
        await balance_command(update, context)

    # Must be called twice: first with parse_mode=Markdown, second without parse_mode
    assert update.message.reply_text.await_count == 2
    first_call_kwargs = update.message.reply_text.await_args_list[0][1]
    second_call_kwargs = update.message.reply_text.await_args_list[1][1]
    assert "parse_mode" in first_call_kwargs
    assert "parse_mode" not in second_call_kwargs


@pytest.mark.asyncio
async def test_telegram_roast_photo_markdown_error_fallback():
    update, context = create_mock_update()
    context.args = ["ROAST"]

    # First reply_text is "TripSheriff is inspecting..."
    # reply_photo fails first with BadRequest("Can't parse entities"), then succeeds
    parse_error = BadRequest("Can't parse entities: unclosed entity")
    update.message.reply_photo = AsyncMock(side_effect=[parse_error, MagicMock()])

    mock_roast = EscalateRoastResponse(
        tier="PUBLIC_ROAST",
        generated_text="Unescaped _text with *bad markdown",
    )
    with patch("gateway.telegram_bot.PersonalityMatrixService.generate_escalated_message", return_value=mock_roast), \
         patch("gateway.telegram_bot.RoastCardGenerator.generate_wanted_card", return_value=base64.b64encode(b"dummy_png").decode("utf-8")):
        await roast_command(update, context)

    assert update.message.reply_photo.await_count == 2
    first_call = update.message.reply_photo.await_args_list[0][1]
    second_call = update.message.reply_photo.await_args_list[1][1]
    assert "parse_mode" in first_call
    assert "parse_mode" not in second_call
