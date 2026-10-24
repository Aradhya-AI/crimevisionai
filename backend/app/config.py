import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "CrimeVision AI"
    API_PREFIX: str = "/api"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DEBUG: bool = True
    
    SECRET_KEY: str = "crimevision-secure-salt-change-in-prod"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://crimevision-ai.vercel.app"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BACKEND_DIR / 'data' / 'crimevision.db'}"
    
    # Storage
    STORAGE_DIR: str = str(BACKEND_DIR / "storage")
    UPLOADS_DIR: str = str(BACKEND_DIR / "storage" / "uploads")
    REPORTS_DIR: str = str(BACKEND_DIR / "storage" / "reports")
    MAX_UPLOAD_SIZE_MB: int = 100
    
    # Groq API settings
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # AI Execution Mode: "DEMO", "LOCAL_AI", "GROQ"
    AI_MODE: str = "DEMO"
    DEVICE: str = "cpu"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = [str(BASE_DIR / ".env"), str(BACKEND_DIR / ".env")]
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.REPORTS_DIR).mkdir(parents=True, exist_ok=True)
Path(BACKEND_DIR / "data").mkdir(parents=True, exist_ok=True)
