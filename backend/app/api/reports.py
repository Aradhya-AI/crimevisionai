import os
import uuid
from datetime import datetime
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import (
    CaseModel, EvidenceModel, AnalysisResultModel, TimelineEventModel,
    ReportModel, ReportCreateRequest, ReportResponse
)
from app.services.report_service import report_generator_service
from app.services.storage import storage_service

router = APIRouter()

@router.post("/cases/{case_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report_endpoint(
    case_id: str,
    payload: ReportCreateRequest,
    db: Session = Depends(get_db)
):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    evidence_items = db.query(EvidenceModel).filter_by(case_id=case_id).all()
    analysis_records = db.query(AnalysisResultModel).filter_by(case_id=case_id).all()
    timeline_events = db.query(TimelineEventModel).filter_by(case_id=case_id).order_by(TimelineEventModel.timestamp_start.asc()).all()

    report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"

    case_info = {
        "id": case.id,
        "title": case.title,
        "location": case.location,
        "incident_date": case.incident_date
    }

    ev_list = [
        {
            "id": e.id,
            "media_type": e.media_type,
            "original_name": e.original_name,
            "sha256_hash": e.sha256_hash,
            "file_size_bytes": e.file_size_bytes
        }
        for e in evidence_items
    ]

    anl_list = [
        {
            "evidence_id": a.evidence_id,
            "media_type": a.media_type,
            "detections": a.detections or [],
            "caption": a.caption or "",
            "transcript": a.transcript or {},
            "observations": a.observations or [],
            "hypotheses": a.hypotheses or []
        }
        for a in analysis_records
    ]

    tl_list = [
        {
            "id": t.id,
            "timestamp_start": t.timestamp_start,
            "timestamp_end": t.timestamp_end,
            "event_type": t.event_type,
            "description": t.description,
            "source_evidence_ids": t.source_evidence_ids or [],
            "verification_status": t.verification_status,
            "confidence": t.confidence
        }
        for t in timeline_events
    ]

    # Generate PDF
    pdf_path_str = report_generator_service.generate_pdf(
        report_id=report_id,
        case_info=case_info,
        evidence_list=ev_list,
        analysis_records=anl_list,
        timeline_events=tl_list,
        investigator_name=payload.investigator_name or "Senior Forensic Examiner",
        notes=payload.notes or ""
    )

    pdf_path = Path(pdf_path_str)
    file_size = pdf_path.stat().st_size if pdf_path.exists() else 0
    pdf_hash = storage_service.calculate_sha256(pdf_path) if pdf_path.exists() else ""

    new_report = ReportModel(
        id=report_id,
        case_id=case_id,
        title=payload.title or "Forensic Multimodal Examination Report",
        status="READY",
        file_path=str(pdf_path),
        file_size_bytes=file_size,
        included_sections=payload.included_sections,
        investigator_name=payload.investigator_name or "Senior Forensic Examiner",
        notes=payload.notes or "",
        sha256_hash=pdf_hash
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report

@router.get("/cases/{case_id}/reports", response_model=List[ReportResponse])
def list_case_reports(case_id: str, db: Session = Depends(get_db)):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return db.query(ReportModel).filter_by(case_id=case_id).order_by(ReportModel.created_at.desc()).all()

@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report_metadata(report_id: str, db: Session = Depends(get_db)):
    rpt = db.query(ReportModel).filter_by(id=report_id).first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")
    return rpt

@router.get("/reports/{report_id}/download")
def download_report_pdf(report_id: str, db: Session = Depends(get_db)):
    rpt = db.query(ReportModel).filter_by(id=report_id).first()
    if not rpt:
        raise HTTPException(status_code=404, detail="Report not found")
    
    file_path = Path(rpt.file_path).resolve()
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=f"{rpt.id}_{rpt.case_id}.pdf",
        media_type="application/pdf"
    )
