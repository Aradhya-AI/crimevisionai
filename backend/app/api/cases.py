from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.schemas import (
    CaseModel, EvidenceModel, TimelineEventModel, ProcessingJobModel,
    CaseCreate, CaseResponse
)

router = APIRouter()

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Computes high-level analytics for forensic command dashboard."""
    total_cases = db.query(CaseModel).count()
    total_evidence = db.query(EvidenceModel).count()
    active_jobs = db.query(ProcessingJobModel).filter(ProcessingJobModel.status.in_(["RUNNING", "QUEUED"])).count()
    completed_jobs = db.query(ProcessingJobModel).filter_by(status="COMPLETED").count()
    failed_jobs = db.query(ProcessingJobModel).filter_by(status="FAILED").count()

    # Recent cases
    recent_cases = db.query(CaseModel).order_by(desc(CaseModel.created_at)).limit(5).all()
    recent_cases_data = [
        {
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "incident_date": c.incident_date,
            "location": c.location,
            "created_at": c.created_at,
            "evidence_count": len(c.evidence_items)
        }
        for c in recent_cases
    ]

    # Media type distribution
    evidence_items = db.query(EvidenceModel).all()
    media_counts = {"image": 0, "video": 0, "audio": 0, "document": 0}
    for ev in evidence_items:
        m = ev.media_type
        media_counts[m] = media_counts.get(m, 0) + 1

    return {
        "total_cases": total_cases,
        "total_evidence_files": total_evidence,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "media_distribution": media_counts,
        "recent_cases": recent_cases_data
    }

@router.get("/cases", response_model=List[CaseResponse])
def list_cases(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    cases = db.query(CaseModel).order_by(desc(CaseModel.created_at)).offset(skip).limit(limit).all()
    results = []
    for c in cases:
        c_dict = {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "incident_date": c.incident_date,
            "location": c.location,
            "lead_investigator": c.lead_investigator,
            "status": c.status,
            "audit_trail": c.audit_trail or [],
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "evidence_count": len(c.evidence_items)
        }
        results.append(c_dict)
    return results

@router.post("/cases", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": "CASE_CREATED",
        "actor": case_in.lead_investigator or "Investigator",
        "detail": f"Investigation initiated: '{case_in.title}'"
    }

    new_case = CaseModel(
        title=case_in.title,
        description=case_in.description or "",
        incident_date=case_in.incident_date or datetime.utcnow().strftime("%Y-%m-%d"),
        location=case_in.location or "Unspecified Location",
        lead_investigator=case_in.lead_investigator or "Forensic Examiner",
        status="OPEN",
        audit_trail=[audit_entry]
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "id": new_case.id,
        "title": new_case.title,
        "description": new_case.description,
        "incident_date": new_case.incident_date,
        "location": new_case.location,
        "lead_investigator": new_case.lead_investigator,
        "status": new_case.status,
        "audit_trail": new_case.audit_trail,
        "created_at": new_case.created_at,
        "updated_at": new_case.updated_at,
        "evidence_count": 0
    }

@router.get("/cases/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(CaseModel).filter_by(id=case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "incident_date": c.incident_date,
        "location": c.location,
        "lead_investigator": c.lead_investigator,
        "status": c.status,
        "audit_trail": c.audit_trail or [],
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "evidence_count": len(c.evidence_items)
    }

@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(CaseModel).filter_by(id=case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    db.delete(c)
    db.commit()
    return None
