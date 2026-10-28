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
    """
    try:
        response = await PersonalityMatrixService.generate_escalated_message(request)

        # Safety filter
        is_safe, reason = ModerationService.is_safe(response.generated_text)
        if not is_safe:
            response.generated_text = (
                f"Reminder for {request.debtor_name}: Please settle ${request.amount_cents / 100:.2f} for {request.expense_description}."
            )

        # If PUBLIC_ROAST tier, attach dynamic wanted card
        if request.tier == "PUBLIC_ROAST":
            response.image_card_base64 = RoastCardGenerator.generate_wanted_card(
                debtor_name=request.debtor_name,
                amount_cents=request.amount_cents,
                description=request.expense_description
            )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
