from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.schemas import CaseModel, TimelineEventModel, TimelineEventResponse

router = APIRouter()

@router.get("/cases/{case_id}/timeline", response_model=List[TimelineEventResponse])
def get_case_timeline(
    case_id: str,
    event_type: Optional[str] = Query(None, description="Filter by event_type"),
    verification_status: Optional[str] = Query(None, description="Filter by verification_status"),
    min_confidence: Optional[float] = Query(None, description="Minimum confidence threshold"),
    db: Session = Depends(get_db)
):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    query = db.query(TimelineEventModel).filter_by(case_id=case_id)

    if event_type:
        query = query.filter(TimelineEventModel.event_type == event_type)
    if verification_status:
        query = query.filter(TimelineEventModel.verification_status == verification_status)
    if min_confidence is not None:
        query = query.filter(TimelineEventModel.confidence >= min_confidence)

    events = query.order_by(TimelineEventModel.timestamp_start.asc()).all()
    return events
