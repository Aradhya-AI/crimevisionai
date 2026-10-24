import os
import sys
import psutil
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import get_db

router = APIRouter()
START_TIME = datetime.utcnow()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Check DB connectivity
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Check Storage directory writeability
    storage_ok = os.path.exists(settings.UPLOADS_DIR) and os.access(settings.UPLOADS_DIR, os.W_OK)

    # Memory usage
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()

    return {
        "status": "healthy" if db_ok and storage_ok else "degraded",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0",
        "uptime_seconds": round((datetime.utcnow() - START_TIME).total_seconds(), 1),
        "database_connected": db_ok,
        "storage_writable": storage_ok,
        "ai_mode": settings.AI_MODE,
        "device": settings.DEVICE,
        "python_version": sys.version.split()[0],
        "memory_usage_mb": round(mem_info.rss / (1024 * 1024), 2)
    }

@router.get("/diagnostics")
def system_diagnostics():
    """Returns detailed forensic hardware and model inspection metrics."""
    # Check PyTorch / GPU availability
    torch_available = False
    cuda_available = False
    gpu_name = None
    try:
        import torch
        torch_available = True
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_name = torch.cuda.get_device_name(0)
    except ImportError:
        pass

    # Check OpenCV
    cv2_available = False
    try:
        import cv2
        cv2_available = True
    except ImportError:
        pass

    # Check Groq Key configuration
    groq_configured = bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5)

    return {
        "hardware": {
            "cpu_cores": psutil.cpu_count(logical=True),
            "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
            "gpu_detected": cuda_available,
            "gpu_device_name": gpu_name or "CPU execution only",
        },
        "model_engines": {
            "rtdetr_detector": {"status": "ready (heuristic/adapter)", "framework": "PyTorch/Torchvision"},
            "whisper_asr": {"status": "ready (pipeline adapter)", "engine": "OpenAI Whisper"},
            "clip_scene_classifier": {"status": "ready", "model": "ViT-B/32"},
            "groq_reasoner": {
                "status": "configured" if groq_configured else "fallback_mode_active",
                "model": settings.GROQ_MODEL
            }
        },
        "storage": {
            "uploads_directory": settings.UPLOADS_DIR,
            "reports_directory": settings.REPORTS_DIR,
            "max_file_size_mb": settings.MAX_UPLOAD_SIZE_MB
        }
    }
