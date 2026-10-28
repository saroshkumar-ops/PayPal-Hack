from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import HealthResponse
from app.routers import receipt, agent, escalate

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

# Include Routers
app.include_router(receipt.router)
app.include_router(agent.router)
app.include_router(escalate.router)


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
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
