from fastapi import APIRouter, HTTPException
from core.schemas import (
    AgentDecideRequest,
    AgentDecideResponse,
    AgentLoopRequest,
    AgentLoopResponse,
)
from agent.agent_service import AgentRouterService
from agent.agent_loop_service import AgentLoopService

router = APIRouter(prefix="/ai/agent", tags=["agent"])


@router.post("/decide", response_model=AgentDecideResponse)
async def decide_action(request: AgentDecideRequest):
    """
    Contract 1.1: Parses conversational chat text and selects tool / action.
    Uses Gemini → Groq → regex fallback depending on available API keys.
    """
    try:
        return await AgentRouterService.decide_intent(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/loop", response_model=AgentLoopResponse)
async def run_agent_loop(request: AgentLoopRequest):
    """
    Contract F (Agentic Tool-Calling Loop): Receives all overdue debts for a trip
    from the Java backend, calculates Debt Heat Scores, selects escalation tiers,
    generates dynamic messages, and returns the full audit log of tool decisions.

    The Java backend should call this endpoint periodically (or when /sim_time is used)
    and relay the generated messages to Telegram / Web Simulator.
    """
    try:
        return await AgentLoopService.run_loop(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
