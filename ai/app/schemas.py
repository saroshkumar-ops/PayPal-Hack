from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


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
# Contract 1.1: Intent Parsing & Tool-Calling (/ai/agent/decide)
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
    action: Literal["LOG_EXPENSE", "CHECK_BALANCES", "DISPUTE_OR_PAUSE", "GENERAL_CHAT"]
    confidence: float
    parsed_data: Optional[ParsedExpenseData] = None
    reply_text: str


# -------------------------------------------------------------
# Contract 1.2: Multimodal Receipt OCR (/ai/receipt/parse & /split)
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
    # claims maps user_id -> list of item indices claimed by that user
    claims: Dict[str, List[int]] = Field(default_factory=dict)
    # all members in the group
    all_members: List[str] = Field(default_factory=list)
    split_unclaimed_equally: bool = True


class ItemizerSplitResponse(BaseModel):
    receipt_total_cents: int
    shares: Dict[str, MemberSplitShare]
    unclaimed_items: List[ReceiptItem] = Field(default_factory=list)
    is_balanced: bool
    discrepancy_cents: int = 0


# -------------------------------------------------------------
# Contract 1.3: Escalation & Roast Generator (/ai/escalate/roast)
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
    tier: Literal[
        "POLITE_CONCIERGE",
        "PASSIVE_AGGRESSIVE",
        "DISAPPOINTED_PARENT",
        "PUBLIC_ROAST",
        "ITINERARY_EMBARGO"
    ] = "POLITE_CONCIERGE"
    roast_consent: Literal["MILD", "SPICY", "NO_ROAST"] = "MILD"
    paypal_checkout_url: str


class EscalateRoastResponse(BaseModel):
    tier: str
    generated_text: str
    image_card_base64: Optional[str] = None
    call_to_action_buttons: List[ButtonItem] = Field(default_factory=list)
