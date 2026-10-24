from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.cases import router as cases_router
from app.api.evidence import router as evidence_router
from app.api.timeline import router as timeline_router
from app.api.chat import router as chat_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health & System"])
api_router.include_router(cases_router, tags=["Cases & Dashboard"])
api_router.include_router(evidence_router, tags=["Evidence & Jobs"])
api_router.include_router(timeline_router, tags=["Timeline"])
api_router.include_router(chat_router, tags=["AI Investigation Assistant"])
api_router.include_router(reports_router, tags=["Forensic Reports"])
api_router.include_router(settings_router, tags=["Settings & Seed"])
