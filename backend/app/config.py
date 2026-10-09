import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'conceptdebt.db'}")
# Any OpenAI-compatible endpoint. Defaults to Featherless.
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.featherless.ai/v1")
AI_API_KEY = os.getenv("AI_API_KEY", os.getenv("FEATHERLESS_API_KEY", "")).strip()
AI_MODEL = os.getenv("AI_MODEL", "Qwen/Qwen2.5-72B-Instruct")
AI_DISABLED = os.getenv("AI_DISABLED", "").lower() in {"1", "true", "yes"}
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

SEED_DIR = BASE_DIR / "seed"
STATIC_DIR = BASE_DIR / "static"
