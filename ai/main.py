import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.schemas import HealthResponse

# Modular Domain Routers
from receipts.router import router as receipts_router
from agent.router import router as agent_router
from escalation.router import router as escalation_router
from gateway.telegram_bot import create_telegram_application

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tg_app = None
    if settings.TELEGRAM_BOT_TOKEN:
        try:
            logger.info("Initializing Telegram Bot Gateway...")
            tg_app = create_telegram_application()
            await tg_app.initialize()
            await tg_app.start()
            await tg_app.updater.start_polling()
            logger.info("Telegram Bot Gateway polling started.")
        except Exception as e:
            logger.error(f"Failed to start Telegram Bot Gateway: {e}")
            tg_app = None
    else:
        logger.info("Telegram Bot Gateway skipped (TELEGRAM_BOT_TOKEN not configured).")

    yield

    if tg_app:
        try:
            logger.info("Stopping Telegram Bot Gateway...")
            await tg_app.updater.stop()
            await tg_app.stop()
            await tg_app.shutdown()
            logger.info("Telegram Bot Gateway shut down cleanly.")
        except Exception as e:
            logger.error(f"Error during Telegram Bot shutdown: {e}")


app = FastAPI(
    title="TripSheriff AI Microservice",
    description="Multimodal receipt OCR, agentic intent parsing, and escalating debt personality matrix.",
    version="1.0.0",
    lifespan=lifespan,
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
    has_live_key = bool(settings.GROQ_API_KEY or settings.GEMINI_API_KEY)
    active_model = settings.GROQ_VISION_MODEL if settings.GROQ_API_KEY else settings.GEMINI_MODEL
    return HealthResponse(
        status="ok",
        service="TripSheriff AI Microservice",
        version="1.0.0",
        mock_mode=settings.USE_MOCK_AI or not has_live_key,
        ai_model=active_model
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
