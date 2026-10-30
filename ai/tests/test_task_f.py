"""
Task F — Comprehensive Test Suite
Covers:
  - /ai/agent/decide: intent parsing for all action types
  - /ai/agent/loop:   autonomous agentic tool-calling loop
  - /ai/escalate/roast: all 5 tiers + roast consent enforcement
  - Debt Heat Score calculation
  - Rate-limit enforcement
  - Safety / moderation guardrails
  - WANTED card generation
"""
import io
import base64
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from main import app

from core.schemas import (
    AgentDecideRequest,
    AgentLoopRequest,
    DebtEntry,
    EscalateRoastRequest,
    MemberSummary,
)
from agent.agent_service import AgentRouterService
from agent.agent_loop_service import AgentLoopService, _calculate_heat_score, _hours_to_tier
from escalation.personality_service import PersonalityMatrixService
from escalation.roast_card_service import RoastCardGenerator
from core.moderation import ModerationService


# ===========================================================================
# Helpers
# ===========================================================================

_MEMBERS = [
    {"user_id": "user_01", "name": "Sarah", "handle": "@sarah_c"},
    {"user_id": "user_02", "name": "Alex", "handle": "@alex_travels"},
    {"user_id": "user_03", "name": "Dave", "handle": "@dave_k"},
]

_BASE_ROAST = {
    "trip_id": "trip_bali_2026",
    "debtor_id": "user_02",
    "debtor_name": "Alex",
    "debtor_handle": "@alex_travels",
    "creditor_name": "Sarah",
    "amount_cents": 8000,
    "currency": "USD",
    "expense_description": "Villa Sunset Deposit",
    "hours_overdue": 36,
    "tier": "DISAPPOINTED_PARENT",
    "roast_consent": "SPICY",
    "paypal_checkout_url": "https://www.sandbox.paypal.com/checkoutnow?token=TEST_TOKEN",
}

_BASE_DEBT = {
    "debtor_id": "user_02",
    "debtor_name": "Alex",
    "debtor_handle": "@alex_travels",
    "creditor_name": "Sarah",
    "amount_cents": 8000,
    "currency": "USD",
    "expense_description": "Villa Sunset Deposit",
    "hours_overdue": 36,
    "reminders_sent": 1,
    "roast_consent": "SPICY",
    "paypal_checkout_url": "https://www.sandbox.paypal.com/checkoutnow?token=TEST",
}


# ===========================================================================
# /ai/agent/decide — intent classification
# ===========================================================================

class TestAgentDecide:

    @pytest.mark.asyncio
    async def test_log_expense_paid_keyword(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Paid $120 for seafood dinner split with everyone",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action"] == "LOG_EXPENSE"
        assert data["parsed_data"]["amount_cents"] == 12000
        assert data["parsed_data"]["payer_id"] == "user_01"
        assert data["confidence"] >= 0.85

    @pytest.mark.asyncio
    async def test_log_expense_spent_keyword(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Spent $45.50 on beach umbrellas for the group",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action"] == "LOG_EXPENSE"
        assert data["parsed_data"]["amount_cents"] == 4550

    @pytest.mark.asyncio
    async def test_log_expense_handle_split(self):
        """Mentions @alex_travels and @dave_k — should resolve to their user_ids."""
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Paid $90 for boat trip split with @alex_travels and @dave_k",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action"] == "LOG_EXPENSE"
        split_ids = data["parsed_data"]["split_with_user_ids"]
        assert "user_02" in split_ids
        assert "user_03" in split_ids

    @pytest.mark.asyncio
    async def test_check_balances(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Who owes what? Balance check!",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        assert res.json()["action"] == "CHECK_BALANCES"

    @pytest.mark.asyncio
    async def test_dispute_keyword_pause(self):
        for kw in ["pause", "dispute", "optout", "freeze"]:
            payload = {
                "trip_id": "trip_bali_2026",
                "sender_id": "user_02",
                "sender_name": "Alex",
                "message_text": f"Please {kw} my reminders",
                "active_members": _MEMBERS,
            }
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                res = await ac.post("/ai/agent/decide", json=payload)
            assert res.status_code == 200
            assert res.json()["action"] == "DISPUTE_OR_PAUSE", f"Failed for keyword: {kw}"

    @pytest.mark.asyncio
    async def test_propose_batch_payout(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Let's settle up — trigger batch payout please",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        assert res.json()["action"] == "PROPOSE_BATCH_PAYOUT"

    @pytest.mark.asyncio
    async def test_general_chat_fallback(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "sender_id": "user_01",
            "sender_name": "Sarah",
            "message_text": "Hey guys, what time is sunset tonight?",
            "active_members": _MEMBERS,
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/decide", json=payload)
        assert res.status_code == 200
        assert res.json()["action"] == "GENERAL_CHAT"


# ===========================================================================
# Agentic loop — unit tests (direct service calls, no HTTP overhead)
# ===========================================================================

class TestAgentLoop:

    def test_heat_score_fresh_debt(self):
        """Small, fresh debt should have a low heat score."""
        debt = DebtEntry(
            debtor_id="user_02",
            debtor_name="Alex",
            creditor_name="Sarah",
            amount_cents=1000,
            expense_description="Coffee",
            hours_overdue=2.0,
            reminders_sent=0,
            roast_consent="SPICY",
            paypal_checkout_url="",
        )
        score = _calculate_heat_score(debt, sim_mode=False)
        assert 0 <= score <= 30, f"Expected low score, got {score}"

    def test_heat_score_old_large_debt(self):
        """Old, large debt with many reminders should max out heat score."""
        debt = DebtEntry(
            debtor_id="user_02",
            debtor_name="Alex",
            creditor_name="Sarah",
            amount_cents=20000,
            expense_description="Hotel",
            hours_overdue=80.0,
            reminders_sent=4,
            roast_consent="SPICY",
            paypal_checkout_url="",
        )
        score = _calculate_heat_score(debt, sim_mode=False)
        assert score >= 80, f"Expected high score, got {score}"
        assert score <= 100

    def test_tier_mapping_fresh(self):
        tier = _hours_to_tier(5.0, "SPICY", 0, sim_mode=False)
        assert tier == "POLITE_CONCIERGE"

    def test_tier_mapping_12h_passive(self):
        tier = _hours_to_tier(18.0, "SPICY", 1, sim_mode=False)
        assert tier == "PASSIVE_AGGRESSIVE"

    def test_tier_mapping_disappointed_parent(self):
        tier = _hours_to_tier(36.0, "SPICY", 2, sim_mode=False)
        assert tier == "DISAPPOINTED_PARENT"

    def test_tier_mapping_public_roast(self):
        tier = _hours_to_tier(60.0, "SPICY", 3, sim_mode=False)
        assert tier == "PUBLIC_ROAST"

    def test_tier_mapping_embargo(self):
        tier = _hours_to_tier(80.0, "SPICY", 5, sim_mode=False)
        assert tier == "ITINERARY_EMBARGO"

    def test_tier_no_roast_always_polite(self):
        """NO_ROAST consent must always produce POLITE_CONCIERGE regardless of overdue time."""
        for hours in [5, 20, 50, 90]:
            tier = _hours_to_tier(float(hours), "NO_ROAST", 0, sim_mode=False)
            assert tier == "POLITE_CONCIERGE", f"Expected polite for NO_ROAST at {hours}h, got {tier}"

    def test_tier_mild_capped_at_disappointed(self):
        """MILD consent must not exceed DISAPPOINTED_PARENT."""
        tier = _hours_to_tier(60.0, "MILD", 3, sim_mode=False)
        assert tier == "DISAPPOINTED_PARENT"

    def test_tier_embargo_after_max_reminders(self):
        """After 4 reminders, tier must be ITINERARY_EMBARGO regardless of hours."""
        tier = _hours_to_tier(10.0, "SPICY", 4, sim_mode=False)
        assert tier == "ITINERARY_EMBARGO"

    def test_sim_mode_compresses_tiers(self):
        """Sim mode should map hours 1–2 to PASSIVE_AGGRESSIVE (not POLITE)."""
        tier = _hours_to_tier(1.5, "SPICY", 1, sim_mode=True)
        assert tier == "PASSIVE_AGGRESSIVE"

    @pytest.mark.asyncio
    async def test_loop_single_debt_sends_action(self):
        req = AgentLoopRequest(
            trip_id="trip_bali_2026",
            overdue_debts=[DebtEntry(**_BASE_DEBT)],
        )
        res = await AgentLoopService.run_loop(req)
        assert res.debts_evaluated == 1
        assert res.actions_taken == 1
        assert len(res.heat_scores) == 1
        assert res.heat_scores[0].action == "SEND_REMINDER"
        assert any(td.tool_name == "escalate_debtor_status" for td in res.tool_decisions)
        assert any(td.tool_name == "send_escalated_message" for td in res.tool_decisions)

    @pytest.mark.asyncio
    async def test_loop_rate_limit_skip(self):
        """A fresh reminder (hours_overdue < 12) after reminders_sent=1 should be skipped."""
        debt = {**_BASE_DEBT, "hours_overdue": 4.0, "reminders_sent": 1}
        req = AgentLoopRequest(
            trip_id="trip_bali_2026",
            overdue_debts=[DebtEntry(**debt)],
        )
        res = await AgentLoopService.run_loop(req)
        assert res.actions_taken == 0
        assert res.heat_scores[0].action == "SKIP_RATE_LIMITED"

    @pytest.mark.asyncio
    async def test_loop_no_roast_skip_after_2_reminders(self):
        debt = {**_BASE_DEBT, "roast_consent": "NO_ROAST", "reminders_sent": 2, "hours_overdue": 20.0}
        req = AgentLoopRequest(
            trip_id="trip_bali_2026",
            overdue_debts=[DebtEntry(**debt)],
        )
        res = await AgentLoopService.run_loop(req)
        assert res.actions_taken == 0
        assert res.heat_scores[0].action == "NO_ACTION_CONSENTED"

    @pytest.mark.asyncio
    async def test_loop_sim_mode_escalates_fast(self):
        """Sim mode: 2.5h should map to DISAPPOINTED_PARENT."""
        debt = {**_BASE_DEBT, "hours_overdue": 2.5, "reminders_sent": 2}
        req = AgentLoopRequest(
            trip_id="trip_bali_2026",
            overdue_debts=[DebtEntry(**debt)],
            sim_mode=True,
        )
        res = await AgentLoopService.run_loop(req)
        assert res.actions_taken == 1
        heat = res.heat_scores[0]
        assert heat.recommended_tier == "DISAPPOINTED_PARENT"

    @pytest.mark.asyncio
    async def test_loop_multiple_debts(self):
        debt2 = {**_BASE_DEBT, "debtor_id": "user_03", "debtor_name": "Dave",
                 "hours_overdue": 14.0, "reminders_sent": 0}
        req = AgentLoopRequest(
            trip_id="trip_bali_2026",
            overdue_debts=[DebtEntry(**_BASE_DEBT), DebtEntry(**debt2)],
        )
        res = await AgentLoopService.run_loop(req)
        assert res.debts_evaluated == 2
        assert res.actions_taken == 2

    @pytest.mark.asyncio
    async def test_loop_http_endpoint(self):
        payload = {
            "trip_id": "trip_bali_2026",
            "overdue_debts": [_BASE_DEBT],
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/agent/loop", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["trip_id"] == "trip_bali_2026"
        assert data["debts_evaluated"] == 1
        assert "heat_scores" in data
        assert "tool_decisions" in data


# ===========================================================================
# /ai/escalate/roast — personality matrix + consent
# ===========================================================================

class TestEscalateRoast:

    @pytest.mark.asyncio
    async def test_tier_1_polite_concierge(self):
        payload = {**_BASE_ROAST, "tier": "POLITE_CONCIERGE", "hours_overdue": 5}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/escalate/roast", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "POLITE_CONCIERGE"
        assert len(data["call_to_action_buttons"]) == 1
        assert "PayPal" in data["call_to_action_buttons"][0]["text"]
        assert data["image_card_base64"] is None

    @pytest.mark.asyncio
    async def test_tier_2_passive_aggressive(self):
        payload = {**_BASE_ROAST, "tier": "PASSIVE_AGGRESSIVE", "hours_overdue": 18}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/escalate/roast", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "PASSIVE_AGGRESSIVE"
        assert len(data["generated_text"]) > 10

    @pytest.mark.asyncio
    async def test_tier_3_disappointed_parent(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/escalate/roast", json=_BASE_ROAST)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "DISAPPOINTED_PARENT"
        text = data["generated_text"].lower()
        # Should contain disappointment language
        assert any(w in text for w in ["beta", "disappoint", "raised", "angry", "hurt", "craft"])

    @pytest.mark.asyncio
    async def test_tier_4_public_roast_returns_image_card(self):
        payload = {**_BASE_ROAST, "tier": "PUBLIC_ROAST", "hours_overdue": 60}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/escalate/roast", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "PUBLIC_ROAST"
        assert data["image_card_base64"] is not None
        # Validate the base64 is a real PNG
        img_bytes = base64.b64decode(data["image_card_base64"])
        img = Image.open(io.BytesIO(img_bytes))
        assert img.format == "PNG"

    @pytest.mark.asyncio
    async def test_tier_5_itinerary_embargo(self):
        payload = {**_BASE_ROAST, "tier": "ITINERARY_EMBARGO", "hours_overdue": 80}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/ai/escalate/roast", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["tier"] == "ITINERARY_EMBARGO"
        assert len(data["generated_text"]) > 10

    @pytest.mark.asyncio
    async def test_no_roast_consent_overrides_tier(self):
        """NO_ROAST should silently downgrade any tier to POLITE_CONCIERGE."""
        for tier in ["PASSIVE_AGGRESSIVE", "DISAPPOINTED_PARENT", "PUBLIC_ROAST", "ITINERARY_EMBARGO"]:
            payload = {**_BASE_ROAST, "tier": tier, "roast_consent": "NO_ROAST"}
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                res = await ac.post("/ai/escalate/roast", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["tier"] == "POLITE_CONCIERGE", (
                f"Expected POLITE_CONCIERGE for NO_ROAST with tier={tier}, got {data['tier']}"
            )
            # Must not contain a meme card
            assert data["image_card_base64"] is None, (
                f"NO_ROAST must not produce image card (tier={tier})"
            )

    @pytest.mark.asyncio
    async def test_mild_consent_capped(self):
        """MILD should downgrade PUBLIC_ROAST and ITINERARY_EMBARGO to DISAPPOINTED_PARENT."""
        for tier in ["PUBLIC_ROAST", "ITINERARY_EMBARGO"]:
            payload = {**_BASE_ROAST, "tier": tier, "roast_consent": "MILD"}
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                res = await ac.post("/ai/escalate/roast", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["tier"] == "DISAPPOINTED_PARENT", (
                f"Expected DISAPPOINTED_PARENT for MILD with tier={tier}, got {data['tier']}"
            )


# ===========================================================================
# Safety / moderation
# ===========================================================================

class TestModeration:

    def test_safe_text_passes(self):
        ok, _ = ModerationService.is_safe("Hey Alex, pay the $80 villa deposit!")
        assert ok is True

    def test_threat_flagged(self):
        ok, reason = ModerationService.is_safe("Pay or I'll kill you!")
        assert ok is False
        assert "flagged" in reason.lower()

    def test_profanity_flagged(self):
        ok, _ = ModerationService.is_safe("You're such a f***ing deadbeat!")
        assert ok is False

    def test_slur_flagged(self):
        ok, _ = ModerationService.is_safe("Don't be a r*tard about this")
        assert ok is False

    def test_opt_out_keywords(self):
        for kw in ["pause", "dispute", "optout", "opt-out", "stop", "freeze"]:
            assert ModerationService.contains_opt_out(f"Please {kw} all reminders"), (
                f"opt_out should detect '{kw}'"
            )

    def test_safe_fallback_format(self):
        msg = ModerationService.safe_fallback("Alex", 8000, "Villa Deposit")
        assert "Alex" in msg
        assert "$80.00" in msg
        assert "Villa Deposit" in msg


# ===========================================================================
# Roast card — image validity
# ===========================================================================

class TestRoastCard:

    def test_wanted_card_is_valid_png(self):
        b64 = RoastCardGenerator.generate_wanted_card(
            debtor_name="Alex",
            amount_cents=8000,
            description="Villa Sunset Deposit",
            debtor_handle="@alex_travels",
            creditor_name="Sarah",
        )
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes))
        assert img.format == "PNG"
        assert img.width == 640
        assert img.height == 480

    def test_wanted_card_no_handle(self):
        """Card should work without a handle (use debtor_name instead)."""
        b64 = RoastCardGenerator.generate_wanted_card(
            debtor_name="Dave",
            amount_cents=3500,
            description="Taxi",
        )
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes))
        assert img.format == "PNG"

    def test_wanted_card_no_blank(self):
        """Generated card must have non-trivial content (not a blank canvas)."""
        b64 = RoastCardGenerator.generate_wanted_card("Alex", 9999, "Dinner")
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes))
        # Check that not all pixels are the background colour (resize for speed)
        thumb = img.resize((64, 48))
        unique_colours = len(set(thumb.tobytes()))
        assert unique_colours > 5, f"Card appears blank (only {unique_colours} unique colours)"
