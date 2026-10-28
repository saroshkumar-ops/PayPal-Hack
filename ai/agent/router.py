from fastapi import APIRouter, HTTPException
from core.schemas import AgentDecideRequest, AgentDecideResponse
from agent.agent_service import AgentRouterService

router = APIRouter(prefix="/ai/agent", tags=["agent"])


@router.post("/decide", response_model=AgentDecideResponse)
async def decide_action(request: AgentDecideRequest):
    """
    Contract 1.1: Parses conversational chat text and selects tool/action.
    """
    try:
        return await AgentRouterService.decide_intent(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
