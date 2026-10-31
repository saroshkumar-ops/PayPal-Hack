"""
TripSheriff AI — 5-Tier Escalating Personality Matrix (Task F)

Generates tone-calibrated debt collection messages across 5 escalation tiers:
  Tier 1 — POLITE_CONCIERGE     : Warm, friendly, helpful
  Tier 2 — PASSIVE_AGGRESSIVE   : Subtle shade, pointed observations
  Tier 3 — DISAPPOINTED_PARENT  : Disappointed Indian/Mediterranean elder energy
  Tier 4 — PUBLIC_ROAST         : Comedic public shaming + WANTED meme card
  Tier 5 — ITINERARY_EMBARGO    : Formal social sanction; no further pings

Roast Consent adherence is MANDATORY:
  NO_ROAST → Tier 1 only (neutral, professional)
  MILD     → Tier 1–3 maximum (no public roast or embargo)
  SPICY    → All 5 tiers available

LLM generation (Gemini → Groq) is used when keys are available.
All outputs pass through ModerationService before being returned.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

from core.config import settings
from core.schemas import (
    ButtonItem,
    EscalateRoastRequest,
    EscalateRoastResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Per-tier prompt templates used to instruct the LLM
# ---------------------------------------------------------------------------
_TIER_PERSONA = {
    "POLITE_CONCIERGE": (
        "You are a warm, friendly personal concierge. Write a brief, upbeat payment "
        "reminder. Use 1–2 relevant emojis. Max 2 sentences. Zero sarcasm."
    ),
    "PASSIVE_AGGRESSIVE": (
        "You are a passive-aggressive group chat friend who has been waiting. Write a "
        "pointed, subtly shady message. Mention that the creditor is still waiting. "
        "Reference the good time the debtor appears to be having. Max 3 sentences."
    ),
    "DISAPPOINTED_PARENT": (
        "You are a disappointed Indian/South Asian/Mediterranean parent-figure. "
        "Use 'beta', 'bro', or similar familiar term of endearment with disappointment. "
        "Reference the specific expense and creditor. Be emotional but never threatening. "
        "Max 3 sentences of guilt-inducing parental sadness."
    ),
    "PUBLIC_ROAST": (
        "You are a roast comedian generating group chat comedic content. "
        "Create a FUNNY, witty, public shaming message about the debtor's unpaid debt. "
        "Reference the specific expense. Use humour, irony, and pop culture. "
        "Add 🚨 emoji. ABSOLUTELY NO real threats, slurs, or profanity. "
        "The goal is laughter, not genuine harm. Max 2–3 sentences."
    ),
    "ITINERARY_EMBARGO": (
        "You are TripSheriff enforcing a formal social sanction. "
        "Write a short, firm, mock-official statement that the debtor has been demoted "
        "to the worst sleeping arrangement until payment clears. "
        "Mention the exact amount and creditor name. Tone: bureaucratic comedy."
    ),
}

# Fallback canned templates (used when LLM is unavailable or mock mode)
_FALLBACK_TEMPLATES = {
    "POLITE_CONCIERGE": (
        "Hey {debtor_name}! 🏖️ Quick friendly reminder — your {amount_fmt} share "
        "for {description} fronted by {creditor_name} is still outstanding. "
        "Tap the link below whenever you're ready!"
    ),
    "PASSIVE_AGGRESSIVE": (
        "Must be nice enjoying that sunset, {debtor_name}... while {creditor_name} "
        "is *still* fronting {amount_fmt} for your {description} from {hours_overdue}h ago. 👀 "
        "No pressure though. We can wait."
    ),
    "DISAPPOINTED_PARENT": (
        "{debtor_name} beta, I am not angry, just disappointed. 😔 "
        "Is this how we raised you? To sip craft cocktails while {creditor_name} "
        "covers your {amount_fmt} {description}? Tap the link. Make it right."
    ),
    "PUBLIC_ROAST": (
        "🚨 **SHAME BOARD ALERT** 🚨\n"
        "{debtor_name} has officially entered the *Deadbeat Hall of Fame*. "
        "{amount_fmt} for {description} is {hours_overdue} hours overdue! "
        "The legend, the myth, the man who orders wagyu on someone else's card. 🪦"
    ),
    "ITINERARY_EMBARGO": (
        "⚖️ **OFFICIAL TRIP SANCTION APPLIED** ⚖️\n"
        "Per TripSheriff Statute §404-DEBT-NOT-FOUND: {debtor_name} has been formally "
        "demoted to the pull-out couch until the {amount_fmt} owed to {creditor_name} "
        "for {description} is settled via PayPal. This is not a drill."
    ),
}


class PersonalityMatrixService:

    @staticmethod
    async def generate_escalated_message(
        request: EscalateRoastRequest,
    ) -> EscalateRoastResponse:
        """
        Generates a tone-calibrated debt collection message for the requested tier.
        Routes through Gemini → Groq → fallback templates.
        """
        amount_fmt = f"${request.amount_cents / 100:.2f}"
        buttons = [
            ButtonItem(
                text=f"💳 Pay {amount_fmt} via PayPal",
                url=request.paypal_checkout_url,
            )
        ]

        text: Optional[str] = None

        # Try LLM generation first (when not in mock mode)
        if not settings.USE_MOCK_AI:
            if settings.GEMINI_API_KEY:
                try:
                    text = await PersonalityMatrixService._call_gemini_roast(request)
                except Exception as exc:
                    logger.warning(f"Gemini roast failed: {exc}")

            if text is None and settings.GROQ_API_KEY:
                try:
                    text = await PersonalityMatrixService._call_groq_roast(request)
                except Exception as exc:
                    logger.warning(f"Groq roast failed: {exc}")

        # Fallback to canned templates
        if text is None:
            text = PersonalityMatrixService._render_template(request)

        return EscalateRoastResponse(
            tier=request.tier,
            generated_text=text,
            image_card_base64=None,
            call_to_action_buttons=buttons,
        )

    # -----------------------------------------------------------------------
    # Gemini dynamic generation
    # -----------------------------------------------------------------------
    @classmethod
    async def _call_gemini_roast(cls, request: EscalateRoastRequest) -> str:
        from google import genai
        from google.genai import types

        persona = _TIER_PERSONA.get(request.tier, _TIER_PERSONA["POLITE_CONCIERGE"])
        prompt = cls._build_roast_prompt(request, persona)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        config = types.GenerateContentConfig(temperature=0.85, max_output_tokens=256)

        models_to_try = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash",
            "gemini-3-flash-preview",
            "gemini-flash-latest"
        ]
        last_error: Optional[Exception] = None

        for model_id in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_id, contents=[prompt], config=config
                )
                return response.text.strip()
            except Exception as exc:
                logger.warning(f"Gemini roast model {model_id} failed: {exc}")
                last_error = exc

        raise RuntimeError(f"All Gemini roast models failed. Last: {last_error}")

    # -----------------------------------------------------------------------
    # Groq dynamic generation
    # -----------------------------------------------------------------------
    @classmethod
    async def _call_groq_roast(cls, request: EscalateRoastRequest) -> str:
        from groq import Groq

        persona = _TIER_PERSONA.get(request.tier, _TIER_PERSONA["POLITE_CONCIERGE"])
        prompt = cls._build_roast_prompt(request, persona)
        client = Groq(api_key=settings.GROQ_API_KEY)

        models_to_try = [
            settings.GROQ_TEXT_MODEL,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ]
        # Keep unique in order
        seen = set()
        unique_models = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

        last_error = None
        for model_id in unique_models:
            try:
                completion = client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": persona},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.85,
                    max_tokens=600,
                )
                res = (completion.choices[0].message.content or "").strip()
                if res:
                    return res
                logger.warning(f"Groq roast model {model_id} returned empty content (possibly exhausted by reasoning tokens)")
            except Exception as exc:
                logger.warning(f"Groq roast model {model_id} failed: {exc}")
                last_error = exc

        raise RuntimeError(f"All Groq roast models failed. Last: {last_error}")

    # -----------------------------------------------------------------------
    # Shared prompt builder
    # -----------------------------------------------------------------------
    @staticmethod
    def _build_roast_prompt(request: EscalateRoastRequest, persona: str) -> str:
        amount_fmt = f"${request.amount_cents / 100:.2f}"
        return (
            f"{persona}\n\n"
            f"Context:\n"
            f"  Debtor name: {request.debtor_name}\n"
            f"  Creditor name: {request.creditor_name}\n"
            f"  Expense: {request.expense_description}\n"
            f"  Amount owed: {amount_fmt}\n"
            f"  Hours overdue: {request.hours_overdue}\n"
            f"  Roast consent level: {request.roast_consent}\n\n"
            "Write only the message text. Do NOT include any preamble, label, or JSON."
        )

    # -----------------------------------------------------------------------
    # Canned template renderer (mock mode / fallback)
    # -----------------------------------------------------------------------
    @staticmethod
    def _render_template(request: EscalateRoastRequest) -> str:
        template = _FALLBACK_TEMPLATES.get(request.tier, _FALLBACK_TEMPLATES["POLITE_CONCIERGE"])
        amount_fmt = f"${request.amount_cents / 100:.2f}"
        return template.format(
            debtor_name=request.debtor_name,
            creditor_name=request.creditor_name,
            description=request.expense_description,
            amount_fmt=amount_fmt,
            hours_overdue=request.hours_overdue,
        )
