import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", "8001"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "true").lower() in ("true", "1", "yes")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    ALLOWED_ORIGINS: List[str] = ["*"]

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }


settings = Settings()
