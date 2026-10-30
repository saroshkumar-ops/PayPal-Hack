import os
from pathlib import Path
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure .env inside ai directory is loaded regardless of current working directory
_ai_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_ai_dir / ".env")
load_dotenv()


class Settings(BaseModel):
    PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "false").lower() in ("true", "1", "yes")

    # Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    # Groq Configuration (Ultra-fast multimodal vision & LLM)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_TEXT_MODEL: str = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview")

    ALLOWED_ORIGINS: List[str] = ["*"]


settings = Settings()
