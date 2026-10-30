"""
TripSheriff AI — Agent Intent Router & LLM Parser (Task F)

Responsibilities:
  1. Parse raw conversational chat messages into structured financial actions.
  2. When LLM keys are available, use Gemini / Groq for rich NLP understanding.
  3. Fall back to a robust regex heuristic engine when USE_MOCK_AI=true or no key.
  4. Respect rate limits and opt-out signals before emitting ESCALATE actions.

Supported actions:
  LOG_EXPENSE        — User reported paying for something; extract amount + split.
  CHECK_BALANCES     — User wants to see the ledger summary.
  DISPUTE_OR_PAUSE   — User is disputing or pausing reminders.
  GENERAL_CHAT       — Unrecognised message; reply with a friendly hint.
  ESCALATE_AND_REMIND — Agent-initiated (from /loop); not a user message action.
  PROPOSE_BATCH_PAYOUT — Trip organiser requesting group settlement.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

from core.config import settings
from core.moderation import ModerationService
from core.schemas import (
    AgentDecideRequest,
    AgentDecideResponse,
    MemberSummary,
    ParsedExpenseData,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt template for Gemini / Groq intent extraction
# ---------------------------------------------------------------------------

_INTENT_PROMPT_TEMPLATE = """
You are the TripSheriff AI intent classifier for a group travel expense app.

Parse the following chat message from a group trip and return a JSON object:

Message: "{message}"
Sender: "{sender_name}" (user_id: "{sender_id}")
Trip members (user_id, name, handle): {members_json}

Rules:
1. If the user is reporting an expense they paid (e.g. "paid $X for Y", "spent $X on Y", "bought Y for $X"):
   - action: "LOG_EXPENSE"
   - parsed_data.description: clean expense description (title case, no handles)
   - parsed_data.amount_cents: integer cents (e.g. $12.50 → 1250)
   - parsed_data.currency: "USD" unless clearly different
   - parsed_data.payer_id: sender's user_id
   - parsed_data.split_type: "EQUAL" (unless custom amounts mentioned → "EXACT")
   - parsed_data.split_with_user_ids: list of user_ids who share the expense.
     If "everyone" / "all" / "the group" → include all member user_ids.
     If specific @handles / names → match to member list.
     Always include payer_id in the split list.
   - reply_text: friendly confirmation e.g. "🍽️ Logged $12.50 Pizza paid by Alice, split 3 ways ($4.17 each)."

2. If user is asking about balances / who owes what:
   - action: "CHECK_BALANCES"
   - reply_text: "📊 Fetching latest trip ledger and net balances..."

3. If user says /pause, /dispute, stop, freeze, dispute, optout:
   - action: "DISPUTE_OR_PAUSE"
   - reply_text: friendly pause confirmation

4. If user says /settle or requests batch payout:
   - action: "PROPOSE_BATCH_PAYOUT"
   - reply_text: brief acknowledgement

5. Otherwise:
   - action: "GENERAL_CHAT"
   - reply_text: friendly TripSheriff usage hint

Respond ONLY with a valid JSON object with these fields:
{{
  "action": "...",
  "confidence": 0.95,
  "reply_text": "...",
  "parsed_data": {{...}} or null
}}
""".strip()


class AgentRouterService:
    # -----------------------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------------------
    @staticmethod
    async def decide_intent(request: AgentDecideRequest) -> AgentDecideResponse:
        """
        Routes a raw chat message to the appropriate structured action.
        Tries LLM first (Gemini → Groq), falls back to regex heuristics.
        """
        text = request.message_text.strip()

        # Safety gate: honour instant opt-out commands immediately
        if ModerationService.contains_opt_out(text):
            return AgentDecideResponse(
                action="DISPUTE_OR_PAUSE",
                confidence=1.0,
                reply_text=(
                    f"⏸️ All automated reminders paused for {request.sender_name}. "
                    "An organiser can review the dispute. "
                    "Type `/resume` when you're ready to continue."
                ),
                tool_called=None,
            )

        # LLM path (when a real key is available and mock mode is off)
        if not settings.USE_MOCK_AI:
            if settings.GEMINI_API_KEY:
                try:
                    return await AgentRouterService._call_gemini_intent(request)
                except Exception as exc:
                    logger.warning(f"Gemini intent parse failed: {exc}; falling back to Groq")

            if settings.GROQ_API_KEY:
                try:
                    return await AgentRouterService._call_groq_intent(request)
                except Exception as exc:
                    logger.warning(f"Groq intent parse failed: {exc}; falling back to regex")

        # Regex / mock heuristic (zero external dependency)
        return AgentRouterService._regex_intent(request)

    # -----------------------------------------------------------------------
    # Gemini LLM intent parsing
    # -----------------------------------------------------------------------
    @classmethod
    async def _call_gemini_intent(cls, request: AgentDecideRequest) -> AgentDecideResponse:
        from google import genai
        from google.genai import types

        prompt = cls._build_prompt(request)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )

        models_to_try = [
            settings.GEMINI_MODEL,
            "gemini-2.0-flash",
            "gemini-1.5-flash-latest",
        ]

        last_error: Optional[Exception] = None
        for model_id in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=[prompt],
                    config=config,
                )
                return cls._parse_llm_json(response.text, request, tool_called=f"gemini:{model_id}")
            except Exception as exc:
                logger.warning(f"Gemini model {model_id} failed: {exc}")
                last_error = exc

        raise RuntimeError(f"All Gemini models failed. Last: {last_error}")

    # -----------------------------------------------------------------------
    # Groq LLM intent parsing
    # -----------------------------------------------------------------------
    @classmethod
    async def _call_groq_intent(cls, request: AgentDecideRequest) -> AgentDecideResponse:
        from groq import Groq

        prompt = cls._build_prompt(request)
        client = Groq(api_key=settings.GROQ_API_KEY)
        models_to_try = [
            settings.GROQ_TEXT_MODEL,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ]
        seen = set()
        unique_models = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

        last_error = None
        for model_id in unique_models:
            try:
                completion = client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are TripSheriff AI. Always respond with valid JSON only. "
                                "No markdown fences, no explanation."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=1024,
                )
                raw = completion.choices[0].message.content.strip()
                return cls._parse_llm_json(raw, request, tool_called=f"groq:{model_id}")
            except Exception as exc:
                logger.warning(f"Groq intent model {model_id} failed: {exc}")
                last_error = exc

        raise RuntimeError(f"All Groq intent models failed. Last: {last_error}")

    # -----------------------------------------------------------------------
    # Prompt builder
    # -----------------------------------------------------------------------
    @staticmethod
    def _build_prompt(request: AgentDecideRequest) -> str:
        members_json = json.dumps(
            [
                {"user_id": m.user_id, "name": m.name, "handle": m.handle or ""}
                for m in request.active_members
            ],
            indent=2,
        )
        return _INTENT_PROMPT_TEMPLATE.format(
            message=request.message_text,
            sender_name=request.sender_name,
            sender_id=request.sender_id,
            members_json=members_json,
        )

    # -----------------------------------------------------------------------
    # Parse raw LLM JSON response into schema
    # -----------------------------------------------------------------------
    @staticmethod
    def _parse_llm_json(
        raw_text: str,
        request: AgentDecideRequest,
        tool_called: Optional[str] = None,
    ) -> AgentDecideResponse:
        # Strip markdown fences if model added them
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)

        data = json.loads(text)

        action = data.get("action", "GENERAL_CHAT")
        confidence = float(data.get("confidence", 0.85))
        reply_text = data.get("reply_text", "")
        parsed_data_raw = data.get("parsed_data")

        parsed_data: Optional[ParsedExpenseData] = None
        if parsed_data_raw and action == "LOG_EXPENSE":
            parsed_data = ParsedExpenseData(
                description=parsed_data_raw.get("description", "Expense"),
                amount_cents=int(parsed_data_raw.get("amount_cents", 0)),
                currency=parsed_data_raw.get("currency", "USD"),
                payer_id=parsed_data_raw.get("payer_id", request.sender_id),
                split_type=parsed_data_raw.get("split_type", "EQUAL"),
                split_with_user_ids=parsed_data_raw.get(
                    "split_with_user_ids",
                    [m.user_id for m in request.active_members] or [request.sender_id],
                ),
            )

        return AgentDecideResponse(
            action=action,
            confidence=confidence,
            parsed_data=parsed_data,
            reply_text=reply_text,
            tool_called=tool_called,
        )

    # -----------------------------------------------------------------------
    # Robust regex / heuristic fallback (works with zero external keys)
    # -----------------------------------------------------------------------
    @staticmethod
    def _regex_intent(request: AgentDecideRequest) -> AgentDecideResponse:
        text = request.message_text.strip()
        lower = text.lower()

        # --- Batch payout / settle ---
        if re.search(r"\b(settle|payout|pay\s+out|batch)\b", lower):
            return AgentDecideResponse(
                action="PROPOSE_BATCH_PAYOUT",
                confidence=0.92,
                reply_text=(
                    "💸 Batch payout proposal queued! "
                    "The organiser will confirm the settlement amount and dispatch PayPal payouts."
                ),
            )

        # --- Balance check ---
        if any(w in lower for w in ["balance", "status", "who owes", "ledger", "summary", "how much", "owe"]):
            return AgentDecideResponse(
                action="CHECK_BALANCES",
                confidence=0.95,
                reply_text="📊 Fetching latest trip ledger and net balances...",
            )

        # --- Expense logging: support "paid $X for Y", "spent $X on Y", "bought Y for $X" ---
        expense_match = re.search(
            r"(?:paid|spent|bought|covered|fronted)\s+\$?([0-9]+(?:[.,][0-9]{1,2})?)(?:\s+(?:for|on)\s+(.+))?",
            lower,
        )
        if expense_match:
            raw_amount = expense_match.group(1).replace(",", ".")
            amount_dollars = float(raw_amount)
            amount_cents = int(round(amount_dollars * 100))
            raw_desc = (expense_match.group(2) or "group expense").strip()

            # Clean description: remove any trailing handle mention
            raw_desc = re.sub(r"\s+(?:with|split\s+with)\s+.*$", "", raw_desc).strip()
            raw_desc = re.sub(r"@\w+", "", raw_desc).strip()

            # Resolve split members: detect @handles or "everyone" / "all"
            split_ids = AgentRouterService._resolve_split_ids(text, request)

            n = len(split_ids)
            per_person = amount_cents // n
            per_person_fmt = f"${per_person / 100:.2f}"
            description = raw_desc.title() or "Group Expense"

            return AgentDecideResponse(
                action="LOG_EXPENSE",
                confidence=0.92,
                parsed_data=ParsedExpenseData(
                    description=description,
                    amount_cents=amount_cents,
                    currency="USD",
                    payer_id=request.sender_id,
                    split_type="EQUAL",
                    split_with_user_ids=split_ids,
                ),
                reply_text=(
                    f"🍽️ Logged **${amount_dollars:.2f} {description}** paid by "
                    f"{request.sender_name}, split {n} ways ({per_person_fmt} each)."
                ),
            )

        # --- Alternate pattern: "X cost $Y split with Z" ---
        cost_match = re.search(
            r"(.+?)\s+cost(?:s)?\s+\$?([0-9]+(?:[.,][0-9]{1,2})?)",
            lower,
        )
        if cost_match:
            raw_desc = cost_match.group(1).strip().title()
            amount_dollars = float(cost_match.group(2).replace(",", "."))
            amount_cents = int(round(amount_dollars * 100))
            split_ids = AgentRouterService._resolve_split_ids(text, request)
            n = len(split_ids)

            return AgentDecideResponse(
                action="LOG_EXPENSE",
                confidence=0.88,
                parsed_data=ParsedExpenseData(
                    description=raw_desc,
                    amount_cents=amount_cents,
                    currency="USD",
                    payer_id=request.sender_id,
                    split_type="EQUAL",
                    split_with_user_ids=split_ids,
                ),
                reply_text=(
                    f"🍽️ Logged **${amount_dollars:.2f} {raw_desc}** paid by "
                    f"{request.sender_name}, split {n} ways."
                ),
            )

        # --- Fallback: general chat ---
        return AgentDecideResponse(
            action="GENERAL_CHAT",
            confidence=0.75,
            reply_text=(
                f"Hey {request.sender_name}! 👋 I'm TripSheriff. "
                "Log expenses with: *\"Paid $50 for dinner\"* "
                "or drop a receipt photo to auto-itemise the bill. "
                "Type *\"balance\"* to see who owes what."
            ),
        )

    # -----------------------------------------------------------------------
    # Helper: resolve which member user_ids should be in the split
    # -----------------------------------------------------------------------
    @staticmethod
    def _resolve_split_ids(text: str, request: AgentDecideRequest) -> list[str]:
        lower = text.lower()
        all_ids = [m.user_id for m in request.active_members] or [request.sender_id]

        # "everyone" / "all" / "the whole group" → all members
        if re.search(r"\b(everyone|everybody|all|whole\s+group|the\s+group)\b", lower):
            return all_ids if all_ids else [request.sender_id]

        # Try matching @handles
        mentioned_handles = re.findall(r"@(\w+)", text)
        if mentioned_handles:
            matched_ids: list[str] = []
            for handle in mentioned_handles:
                for member in request.active_members:
                    if member.handle and member.handle.lstrip("@").lower() == handle.lower():
                        matched_ids.append(member.user_id)
            # Always include the payer
            if request.sender_id not in matched_ids:
                matched_ids.insert(0, request.sender_id)
            if matched_ids:
                return matched_ids

        # Try matching member names
        named_ids: list[str] = []
        for member in request.active_members:
            if member.name.lower() in lower and member.user_id not in named_ids:
                named_ids.append(member.user_id)
        if request.sender_id not in named_ids:
            named_ids.insert(0, request.sender_id)
        if len(named_ids) > 1:
            return named_ids

        # Default: split with everyone
        return all_ids if all_ids else [request.sender_id]
