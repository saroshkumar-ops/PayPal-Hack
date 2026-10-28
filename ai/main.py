from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.schemas import HealthResponse

# Modular Domain Routers
from receipts.router import router as receipts_router
from agent.router import router as agent_router
from escalation.router import router as escalation_router

app = FastAPI(
    title="TripSheriff AI Microservice",
    description="Multimodal receipt OCR, agentic intent parsing, and escalating debt personality matrix.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Domain Routers
app.include_router(receipts_router)
app.include_router(agent_router)
app.include_router(escalation_router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse(
        status="ok",
        service="TripSheriff AI Microservice",
        version="1.0.0",
        mock_mode=settings.USE_MOCK_AI or not bool(settings.GEMINI_API_KEY),
        ai_model=settings.GEMINI_MODEL
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
