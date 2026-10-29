from typing import List, Optional, Literal, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator


# -------------------------------------------------------------
# Common Models
# -------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "TripSheriff AI Microservice"
    version: str = "1.0.0"
    mock_mode: bool
    ai_model: str


# -------------------------------------------------------------
# Task F - Agent Models (/ai/agent/decide)
# -------------------------------------------------------------
class MemberSummary(BaseModel):
    user_id: str
    name: str
    handle: Optional[str] = None


class AgentDecideRequest(BaseModel):
    trip_id: str
    sender_id: str
    sender_name: str
    message_text: str
    active_members: List[MemberSummary] = Field(default_factory=list)


class ParsedExpenseData(BaseModel):
    description: str
    amount_cents: int
    currency: str = "USD"
    payer_id: str
    split_type: Literal["EQUAL", "EXACT", "ITEMIZED"] = "EQUAL"
    split_with_user_ids: List[str] = Field(default_factory=list)


class AgentDecideResponse(BaseModel):
    action: Literal[
        "LOG_EXPENSE",
        "CHECK_BALANCES",
        "DISPUTE_OR_PAUSE",
        "GENERAL_CHAT",
        "ESCALATE_AND_REMIND",
        "PROPOSE_BATCH_PAYOUT",
    ]
    confidence: float
    parsed_data: Optional[ParsedExpenseData] = None
    reply_text: str
    # Optional: which LLM tool was invoked (for agentic loop logging)
    tool_called: Optional[str] = None


# -------------------------------------------------------------
# Task F - Escalation & Roast Models (/ai/escalate/roast)
# -------------------------------------------------------------
class ButtonItem(BaseModel):
    text: str
    url: str


class EscalateRoastRequest(BaseModel):
    trip_id: str
    debtor_id: str
    debtor_name: str
    debtor_handle: Optional[str] = None
    creditor_name: str
    amount_cents: int
    currency: str = "USD"
    expense_description: str
    hours_overdue: int
    # roast_consent MUST be declared before tier so the validator can read it
    roast_consent: Literal["MILD", "SPICY", "NO_ROAST"] = "MILD"
    tier: Literal[
        "POLITE_CONCIERGE",
        "PASSIVE_AGGRESSIVE",
        "DISAPPOINTED_PARENT",
        "PUBLIC_ROAST",
        "ITINERARY_EMBARGO"
    ] = "POLITE_CONCIERGE"
    paypal_checkout_url: str

    @field_validator("tier")
    @classmethod
    def validate_consent_vs_tier(cls, tier: str, info) -> str:
        """Enforce that NO_ROAST members cannot receive tiers above POLITE_CONCIERGE."""
        consent = info.data.get("roast_consent", "MILD")
        roast_tiers = {"PASSIVE_AGGRESSIVE", "DISAPPOINTED_PARENT", "PUBLIC_ROAST", "ITINERARY_EMBARGO"}
        if consent == "NO_ROAST" and tier in roast_tiers:
            return "POLITE_CONCIERGE"
        # MILD consent: cap at DISAPPOINTED_PARENT
        mild_blocked = {"PUBLIC_ROAST", "ITINERARY_EMBARGO"}
        if consent == "MILD" and tier in mild_blocked:
            return "DISAPPOINTED_PARENT"
        return tier


class EscalateRoastResponse(BaseModel):
    tier: str
    generated_text: str
    image_card_base64: Optional[str] = None
    call_to_action_buttons: List[ButtonItem] = Field(default_factory=list)


# -------------------------------------------------------------
# Task G - Multimodal Receipt OCR Models (/ai/receipt/parse & /split)
# -------------------------------------------------------------
class ReceiptItem(BaseModel):
    index: Optional[int] = None
    name: str
    qty: int = 1
    price_cents: int


class ReceiptParseRequest(BaseModel):
    trip_id: Optional[str] = None
    image_base64: str
    currency: str = "USD"


class ReceiptParseResponse(BaseModel):
    status: Literal["SUCCESS", "FAILED"]
    merchant: str
    date: Optional[str] = None
    subtotal_cents: int
    tax_cents: int = 0
    tip_cents: int = 0
    total_cents: int
    items: List[ReceiptItem] = Field(default_factory=list)
    suggested_reply: str


class MemberSplitShare(BaseModel):
    user_id: str
    claimed_item_names: List[str] = Field(default_factory=list)
    items_subtotal_cents: int
    proportional_tax_cents: int
    proportional_tip_cents: int
    unclaimed_pool_share_cents: int = 0
    total_cents: int
    breakdown_text: str


class ItemizerSplitRequest(BaseModel):
    receipt: ReceiptParseResponse
    claims: Dict[str, List[int]] = Field(default_factory=dict)
    all_members: List[str] = Field(default_factory=list)
    split_unclaimed_equally: bool = True


class ItemizerSplitResponse(BaseModel):
    receipt_total_cents: int
    shares: Dict[str, MemberSplitShare]
    unclaimed_items: List[ReceiptItem] = Field(default_factory=list)
    is_balanced: bool
    discrepancy_cents: int = 0


# -------------------------------------------------------------
# Task F — Agentic Tool-Calling Loop (/ai/agent/loop)
# -------------------------------------------------------------

class DebtEntry(BaseModel):
    """Represents a single outstanding debt for one member."""
    debtor_id: str
    debtor_name: str
    debtor_handle: Optional[str] = None
    creditor_name: str
    amount_cents: int
    currency: str = "USD"
    expense_description: str
    hours_overdue: float
    reminders_sent: int = 0
    roast_consent: Literal["MILD", "SPICY", "NO_ROAST"] = "MILD"
    paypal_checkout_url: str = ""


class DebtHeatScore(BaseModel):
    """Calculated heat score and recommended escalation tier for a debt."""
    debtor_id: str
    score: int = Field(ge=0, le=100, description="0=cold, 100=maximum escalation")
    recommended_tier: Literal[
        "POLITE_CONCIERGE",
        "PASSIVE_AGGRESSIVE",
        "DISAPPOINTED_PARENT",
        "PUBLIC_ROAST",
        "ITINERARY_EMBARGO",
    ]
    action: Literal[
        "SEND_REMINDER",
        "SKIP_RATE_LIMITED",
        "EMBARGO_APPLIED",
        "NO_ACTION_CONSENTED",
    ]
    reason: str


class AgentToolDecision(BaseModel):
    """A single tool invocation decision made by the agentic loop."""
    tool_name: Literal[
        "query_ledger_balances",
        "escalate_debtor_status",
        "create_paypal_order",
        "propose_batch_payout",
        "send_escalated_message",
    ]
    parameters: Dict[str, Any] = Field(default_factory=dict)
    result_summary: str


class AgentLoopRequest(BaseModel):
    """Autonomous agentic loop request: processes all overdue debts for a trip."""
    trip_id: str
    overdue_debts: List[DebtEntry] = Field(default_factory=list)
    # Optional context passed in by the Java backend (simulated ledger state)
    ledger_summary: Optional[str] = None
    sim_mode: bool = Field(
        default=False,
        description="If True, treat as judge demo simulation (allows rapid tier escalation)",
    )


class AgentLoopResponse(BaseModel):
    """Response from the autonomous agentic loop: per-debt actions taken."""
    trip_id: str
    debts_evaluated: int
    actions_taken: int
    heat_scores: List[DebtHeatScore] = Field(default_factory=list)
    tool_decisions: List[AgentToolDecision] = Field(default_factory=list)
    summary_text: str
