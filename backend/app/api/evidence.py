import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import (
    CaseModel, EvidenceModel, AnalysisResultModel, ProcessingJobModel,
    EvidenceResponse, AnalysisResultResponse, JobStatusResponse
)
from app.services.storage import storage_service
from app.services.background_jobs import background_job_manager

router = APIRouter()

@router.post("/cases/{case_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Forensic Evidence Ingestion:
    - Verifies Case existence
    - Saves file to secure storage sandbox
    - Computes cryptographic SHA-256 integrity hash
    - Infers media type (image/video/audio/document)
    - Records audit trail
    """
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    evidence_id = f"EVD-{uuid.uuid4().hex[:8].upper()}"

    # Save to disk with SHA-256 integrity check
    try:
        saved_path, safe_name, file_size, sha256_hash = await storage_service.save_evidence_file(
            case_id=case_id,
            evidence_id=evidence_id,
            upload_file=file
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest evidence: {e}")

    media_type = storage_service.detect_media_type(safe_name, file.content_type or "")

    new_evidence = EvidenceModel(
        id=evidence_id,
        case_id=case_id,
        filename=f"{evidence_id}_{safe_name}",
        original_name=safe_name,
        media_type=media_type,
        file_path=saved_path,
        file_size_bytes=file_size,
        sha256_hash=sha256_hash,
        mime_type=file.content_type or "application/octet-stream",
        metadata_info={"ingest_timestamp": datetime.utcnow().isoformat()},
        analysis_status="PENDING"
    )

    # Append to case audit trail
    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": "EVIDENCE_UPLOADED",
        "evidence_id": evidence_id,
        "filename": safe_name,
        "sha256_hash": sha256_hash
    }
    current_audit = list(case.audit_trail or [])
    current_audit.append(audit_entry)
    case.audit_trail = current_audit

    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)

    return new_evidence

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def list_case_evidence(case_id: str, db: Session = Depends(get_db)):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return db.query(EvidenceModel).filter_by(case_id=case_id).order_by(EvidenceModel.created_at.desc()).all()

@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(EvidenceModel).filter_by(id=evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    return ev

@router.get("/evidence/{evidence_id}/analysis", response_model=AnalysisResultResponse)
def get_evidence_analysis(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(EvidenceModel).filter_by(id=evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    
    anl = db.query(AnalysisResultModel).filter_by(evidence_id=evidence_id).first()
    if not anl:
        raise HTTPException(status_code=404, detail="Analysis results not yet generated for this evidence item")
    return anl

@router.get("/evidence/{evidence_id}/download")
def download_evidence(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(EvidenceModel).filter_by(id=evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    
    file_path = storage_service.get_evidence_path(ev.file_path)
    return FileResponse(
        path=str(file_path),
        filename=ev.original_name,
        media_type=ev.mime_type
    )

@router.post("/evidence/{evidence_id}/analyze", response_model=JobStatusResponse)
def analyze_evidence_endpoint(
    evidence_id: str,
    db: Session = Depends(get_db)
):
    """Triggers asynchronous AI analysis on evidence item."""
    ev = db.query(EvidenceModel).filter_by(id=evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    job = ProcessingJobModel(
        id=job_id,
        evidence_id=ev.id,
        case_id=ev.case_id,
        status="QUEUED",
        progress_pct=5,
        message="Queued for multimodal analysis"
    )
    db.add(job)
    db.commit()

    # Trigger background processor
    background_job_manager.start_evidence_analysis(job_id, ev.id, ev.case_id)

    return job

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJobModel).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return job

@router.post("/jobs/{job_id}/cancel")
def cancel_job_endpoint(job_id: str, db: Session = Depends(get_db)):
    cancelled = background_job_manager.cancel_job(job_id)
    return {"job_id": job_id, "cancelled": cancelled}
