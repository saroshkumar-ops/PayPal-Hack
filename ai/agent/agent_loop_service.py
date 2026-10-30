"""
TripSheriff AI — Autonomous Agentic Tool-Calling Loop (Task F)

The loop:
  1. Receives all overdue debts for a trip from the Java backend.
  2. Calculates a Debt Heat Score (0–100) per debtor based on hours overdue,
     amount, reminders already sent, and roast consent.
  3. Decides which tool to invoke (escalate_debtor_status, create_paypal_order,
     propose_batch_payout, or SKIP for rate-limiting).
  4. Calls the PersonalityMatrixService to generate the dynamic message.
  5. Returns a full audit log of all tool decisions for the Java backend to relay
     to Telegram / Web Simulator.

Rate-limit contract:
  - Max 1 automated reminder per 12 hours per debtor.
  - Max 4 total reminders before applying Tier 5 (ITINERARY_EMBARGO).
  - Once ITINERARY_EMBARGO is set, no further automated pings.
"""
from __future__ import annotations

import logging
from typing import Optional

from core.schemas import (
    AgentLoopRequest,
    AgentLoopResponse,
    AgentToolDecision,
    DebtEntry,
    DebtHeatScore,
    EscalateRoastRequest,
)
from escalation.personality_service import PersonalityMatrixService
from core.moderation import ModerationService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tier mapping tables
# ---------------------------------------------------------------------------

# hours_overdue → escalation tier (upper bound of window is the key)
_HOUR_TIER_MAP: list[tuple[float, str]] = [
    (12.0, "POLITE_CONCIERGE"),
    (24.0, "PASSIVE_AGGRESSIVE"),
    (48.0, "DISAPPOINTED_PARENT"),
    (72.0, "PUBLIC_ROAST"),
    (1_000_000.0, "ITINERARY_EMBARGO"),
]

# MILD consent: cap at DISAPPOINTED_PARENT
_MILD_CAP = {"PUBLIC_ROAST": "DISAPPOINTED_PARENT", "ITINERARY_EMBARGO": "DISAPPOINTED_PARENT"}

# Max reminders before Tier 5 applies regardless
_MAX_REMINDERS = 4
# Minimum hours between automated reminders
_RATE_LIMIT_HOURS = 12.0


def _hours_to_tier(hours: float, consent: str, reminders_sent: int, sim_mode: bool) -> str:
    """Maps overdue hours to escalation tier, respecting consent and reminder cap."""
    if sim_mode:
        # In demo/sim mode, compress tiers to 1-hour windows
        tier_windows: list[tuple[float, str]] = [
            (1.0, "POLITE_CONCIERGE"),
            (2.0, "PASSIVE_AGGRESSIVE"),
            (3.0, "DISAPPOINTED_PARENT"),
            (4.0, "PUBLIC_ROAST"),
            (1_000_000.0, "ITINERARY_EMBARGO"),
        ]
    else:
        tier_windows = _HOUR_TIER_MAP

    tier = "POLITE_CONCIERGE"
    for threshold, t in tier_windows:
        if hours <= threshold:
            tier = t
            break

    # Hard-cap at ITINERARY_EMBARGO after max reminders
    if reminders_sent >= _MAX_REMINDERS:
        tier = "ITINERARY_EMBARGO"

    # Apply consent restrictions
    if consent == "NO_ROAST":
        tier = "POLITE_CONCIERGE"
    elif consent == "MILD" and tier in _MILD_CAP:
        tier = _MILD_CAP[tier]

    return tier


def _calculate_heat_score(debt: DebtEntry, sim_mode: bool) -> int:
    """
    Computes 0–100 Debt Heat Score.

    Factors:
      - Hours overdue (up to 50 points, saturates at 72 h)
      - Amount relative to $100 (up to 25 points)
      - Reminders already sent without payment (up to 25 points)
    """
    # Hours component: 0–50
    reference_hours = 72.0 if not sim_mode else 4.0
    hour_score = min(50, int((debt.hours_overdue / reference_hours) * 50))

    # Amount component: 0–25
    amount_score = min(25, int((debt.amount_cents / 10_000) * 25))

    # Persistence component: 0–25
    persistence_score = min(25, debt.reminders_sent * 6)

    return hour_score + amount_score + persistence_score


class AgentLoopService:
    @staticmethod
    async def run_loop(request: AgentLoopRequest) -> AgentLoopResponse:
        """
        Main autonomous agentic loop: evaluates all overdue debts and
        selects the appropriate tool invocation for each debtor.
        """
        trip_id = request.trip_id
        heat_scores: list[DebtHeatScore] = []
        tool_decisions: list[AgentToolDecision] = []
        actions_taken = 0

        for debt in request.overdue_debts:
            heat = _calculate_heat_score(debt, request.sim_mode)
            tier = _hours_to_tier(
                debt.hours_overdue, debt.roast_consent, debt.reminders_sent, request.sim_mode
            )

            # --- Rate limiting ---
            # The Java backend tracks reminders_sent. We trust that value.
            # Skip if the most recent reminder was < 12 hours ago
            # (Java encodes this by passing hours_overdue < _RATE_LIMIT_HOURS
            #  when the last reminder was too recent).
            if (
                not request.sim_mode
                and tier != "ITINERARY_EMBARGO"
                and debt.reminders_sent > 0
                and debt.hours_overdue < _RATE_LIMIT_HOURS
            ):
                heat_scores.append(
                    DebtHeatScore(
                        debtor_id=debt.debtor_id,
                        score=heat,
                        recommended_tier=tier,
                        action="SKIP_RATE_LIMITED",
                        reason=(
                            f"Last reminder sent {debt.hours_overdue:.1f}h ago. "
                            f"Minimum interval is {_RATE_LIMIT_HOURS}h."
                        ),
                    )
                )
                continue

            # --- NO_ROAST + already reminded politely → skip further pestering ---
            if debt.roast_consent == "NO_ROAST" and debt.reminders_sent >= 2:
                heat_scores.append(
                    DebtHeatScore(
                        debtor_id=debt.debtor_id,
                        score=heat,
                        recommended_tier="POLITE_CONCIERGE",
                        action="NO_ACTION_CONSENTED",
                        reason="Member opted out of roast; max polite reminders already sent.",
                    )
                )
                continue

            # --- ITINERARY_EMBARGO: single status update, no repeated pings ---
            if tier == "ITINERARY_EMBARGO":
                action_label = "EMBARGO_APPLIED"
                reason = (
                    f"{debt.debtor_name} has been in debt for {debt.hours_overdue:.0f}h "
                    f"with {debt.reminders_sent} prior reminders. Applying itinerary sanction."
                )
                heat_scores.append(
                    DebtHeatScore(
                        debtor_id=debt.debtor_id,
                        score=heat,
                        recommended_tier=tier,
                        action=action_label,
                        reason=reason,
                    )
                )
            else:
                heat_scores.append(
                    DebtHeatScore(
                        debtor_id=debt.debtor_id,
                        score=heat,
                        recommended_tier=tier,
                        action="SEND_REMINDER",
                        reason=(
                            f"Debt ${debt.amount_cents / 100:.2f} overdue {debt.hours_overdue:.0f}h. "
                            f"Heat score: {heat}. Tier: {tier}. "
                            f"Reminders sent: {debt.reminders_sent}."
                        ),
                    )
                )

            # --- Tool: escalate_debtor_status ---
            tool_decisions.append(
                AgentToolDecision(
                    tool_name="escalate_debtor_status",
                    parameters={
                        "debtor_id": debt.debtor_id,
                        "current_tier": tier,
                        "hours_overdue": debt.hours_overdue,
                        "heat_score": heat,
                    },
                    result_summary=f"Escalated {debt.debtor_name} to tier {tier} (score={heat}).",
                )
            )

            # --- Tool: send_escalated_message (calls PersonalityMatrixService) ---
            escalate_request = EscalateRoastRequest(
                trip_id=trip_id,
                debtor_id=debt.debtor_id,
                debtor_name=debt.debtor_name,
                debtor_handle=debt.debtor_handle,
                creditor_name=debt.creditor_name,
                amount_cents=debt.amount_cents,
                currency=debt.currency,
                expense_description=debt.expense_description,
                hours_overdue=int(debt.hours_overdue),
                tier=tier,
                roast_consent=debt.roast_consent,
                paypal_checkout_url=debt.paypal_checkout_url,
            )

            try:
                escalation_response = await PersonalityMatrixService.generate_escalated_message(
                    escalate_request
                )
                generated_text = escalation_response.generated_text

                # Safety pass
                is_safe, reason = ModerationService.is_safe(generated_text)
                if not is_safe:
                    generated_text = ModerationService.safe_fallback(
                        debt.debtor_name, debt.amount_cents, debt.expense_description
                    )
                    logger.warning(f"Moderation flagged message for {debt.debtor_name}: {reason}")

                tool_decisions.append(
                    AgentToolDecision(
                        tool_name="send_escalated_message",
                        parameters={
                            "tier": tier,
                            "debtor_id": debt.debtor_id,
                            "generated_text": generated_text,
                            "checkout_url": debt.paypal_checkout_url,
                            "buttons": [b.model_dump() for b in escalation_response.call_to_action_buttons],
                        },
                        result_summary=(
                            f"Message generated for {debt.debtor_name} [{tier}]: "
                            f"{generated_text[:80]}..."
                        ),
                    )
                )
            except Exception as exc:
                logger.error(f"Escalation generation failed for {debt.debtor_id}: {exc}")
                tool_decisions.append(
                    AgentToolDecision(
                        tool_name="send_escalated_message",
                        parameters={"debtor_id": debt.debtor_id, "error": str(exc)},
                        result_summary=f"Error generating message for {debt.debtor_name}.",
                    )
                )

            actions_taken += 1

        # --- Build summary ---
        if actions_taken == 0:
            summary = f"✅ Trip '{trip_id}': All debtors are either up-to-date or rate-limited. No reminders sent."
        else:
            summary = (
                f"⚡ Trip '{trip_id}': Evaluated {len(request.overdue_debts)} debt(s). "
                f"Dispatched {actions_taken} escalation action(s). "
                f"Heat scores computed for all debtors."
            )

        return AgentLoopResponse(
            trip_id=trip_id,
            debts_evaluated=len(request.overdue_debts),
            actions_taken=actions_taken,
            heat_scores=heat_scores,
            tool_decisions=tool_decisions,
            summary_text=summary,
        )
