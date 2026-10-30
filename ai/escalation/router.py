from fastapi import APIRouter, HTTPException
from core.schemas import EscalateRoastRequest, EscalateRoastResponse
from escalation.personality_service import PersonalityMatrixService
from escalation.roast_card_service import RoastCardGenerator
from core.moderation import ModerationService

router = APIRouter(prefix="/ai/escalate", tags=["escalate"])


@router.post("/roast", response_model=EscalateRoastResponse)
async def generate_roast(request: EscalateRoastRequest):
    """
    Contract 1.3: Generates comedic debt escalation messages across 5 tiers.

    - POLITE_CONCIERGE     (0–12h)  : Warm, friendly reminder
    - PASSIVE_AGGRESSIVE   (12–24h) : Subtle shade and pointed observations
    - DISAPPOINTED_PARENT  (24–48h) : Guilt-inducing parental disappointment
    - PUBLIC_ROAST         (48–72h) : Comedic group shaming + WANTED meme card
    - ITINERARY_EMBARGO    (>72h)   : Formal social sanction

    Roast consent is enforced:
      NO_ROAST → silently downgraded to POLITE_CONCIERGE (enforced by schema validator).
      MILD     → capped at DISAPPOINTED_PARENT.
      SPICY    → all tiers available.
    """
    try:
        response = await PersonalityMatrixService.generate_escalated_message(request)

        # Safety filter — replace flagged text with neutral fallback
        is_safe, reason = ModerationService.is_safe(response.generated_text)
        if not is_safe:
            response.generated_text = ModerationService.safe_fallback(
                request.debtor_name, request.amount_cents, request.expense_description
            )

        # PUBLIC_ROAST tier → attach dynamic WANTED meme card
        if request.tier == "PUBLIC_ROAST":
            response.image_card_base64 = RoastCardGenerator.generate_wanted_card(
                debtor_name=request.debtor_name,
                amount_cents=request.amount_cents,
                description=request.expense_description,
                debtor_handle=request.debtor_handle,
                creditor_name=request.creditor_name,
            )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
