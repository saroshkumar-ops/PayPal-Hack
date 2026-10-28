import re
from app.schemas import AgentDecideRequest, AgentDecideResponse, ParsedExpenseData


class AgentRouterService:
    @staticmethod
    async def decide_intent(request: AgentDecideRequest) -> AgentDecideResponse:
        """
        Parses raw natural chat messages into structured intent and tool calls.
        """
        text = request.message_text.strip()
        lower = text.lower()

        # Check for pause / dispute
        if any(w in lower for w in ["pause", "dispute", "stop reminder", "freeze"]):
            return AgentDecideResponse(
                action="DISPUTE_OR_PAUSE",
                confidence=0.99,
                reply_text=f"⏸️ Reminders paused for {request.sender_name}. An organizer can review the expense."
            )

        # Check for balance / status check
        if any(w in lower for w in ["balance", "status", "who owes", "ledger", "summary"]):
            return AgentDecideResponse(
                action="CHECK_BALANCES",
                confidence=0.95,
                reply_text="📊 Fetching latest trip ledger and net balances..."
            )

        # Basic regex pattern for expense detection: "paid $XX for Y"
        match = re.search(r"paid\s+\$?([0-9]+(?:\.[0-9]{1,2})?)\s+(?:for\s+)?(.+)", lower)
        if match:
            amount_dollars = float(match.group(1))
            amount_cents = int(round(amount_dollars * 100))
            raw_desc = match.group(2).strip()

            split_ids = [m.user_id for m in request.active_members] if request.active_members else [request.sender_id]

            return AgentDecideResponse(
                action="LOG_EXPENSE",
                confidence=0.92,
                parsed_data=ParsedExpenseData(
                    description=raw_desc.title(),
                    amount_cents=amount_cents,
                    currency="USD",
                    payer_id=request.sender_id,
                    split_type="EQUAL",
                    split_with_user_ids=split_ids
                ),
                reply_text=f"🍽️ Logged **${amount_dollars:.2f} {raw_desc.title()}** paid by {request.sender_name}."
            )

        # Fallback to general conversational chat
        return AgentDecideResponse(
            action="GENERAL_CHAT",
            confidence=0.80,
            reply_text=f"Hey {request.sender_name}! I'm TripSheriff. Drop receipts or log expenses anytime (e.g. 'Paid $50 for dinner')."
        )
