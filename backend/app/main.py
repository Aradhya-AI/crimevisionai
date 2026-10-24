import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.api import api_router

app = FastAPI(
    title="CrimeVision AI — Intelligent Multimodal Forensic Analysis Platform",
    description="Production-grade AI decision-support platform for multimodal criminal forensics (RT-DETR, Whisper, CLIP, Groq, ReportLab).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup lifecycle: initialize tables and storage folders
@app.on_event("startup")
def on_startup():
    init_db()

# Global exception handler for uniform forensic error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "A forensic processing exception occurred.",
            "detail": str(exc) if settings.DEBUG else "Please check application server logs.",
            "path": request.url.path
        }
    )

# Static file serving for evidence preview in development
uploads_path = Path(settings.UPLOADS_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Include master API router
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "platform": "CrimeVision AI",
        "description": "Production Multimodal Forensic Intelligence Platform",
        "version": "1.0.0",
        "api_docs": "/docs",
        "health": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
