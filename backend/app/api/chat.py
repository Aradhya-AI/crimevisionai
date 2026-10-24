import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import (
    CaseModel, EvidenceModel, AnalysisResultModel, TimelineEventModel,
    ChatMessageModel, ChatQueryRequest, ChatMessageResponse
)
from app.services.groq_service import groq_forensic_service

router = APIRouter()

@router.post("/cases/{case_id}/chat", response_model=ChatMessageResponse)
def query_case_chat(
    case_id: str,
    payload: ChatQueryRequest,
    db: Session = Depends(get_db)
):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    conversation_id = payload.conversation_id or f"CONV-{uuid.uuid4().hex[:8].upper()}"

    # 1. Save user question
    user_msg = ChatMessageModel(
        id=f"MSG-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        conversation_id=conversation_id,
        role="user",
        content=payload.question,
        citations=[]
    )
    db.add(user_msg)
    db.commit()

    # 2. Gather case context
    evidence_items = db.query(EvidenceModel).filter_by(case_id=case_id).all()
    analysis_records = db.query(AnalysisResultModel).filter_by(case_id=case_id).all()
    timeline_events = db.query(TimelineEventModel).filter_by(case_id=case_id).order_by(TimelineEventModel.timestamp_start.asc()).all()

    case_info = {
        "id": case.id,
        "title": case.title,
        "location": case.location,
        "incident_date": case.incident_date
    }

    ev_list = [
        {"id": e.id, "media_type": e.media_type, "original_name": e.original_name, "sha256_hash": e.sha256_hash}
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

    # 3. Call Grounded Groq / Forensic Reasoner
    groq_result = groq_forensic_service.answer_query(
        question=payload.question,
        case_info=case_info,
        evidence_list=ev_list,
        analysis_records=anl_list,
        timeline_events=tl_list
    )

    # 4. Save assistant response
    assistant_msg = ChatMessageModel(
        id=f"MSG-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        conversation_id=conversation_id,
        role="assistant",
        content=groq_result.get("answer", "No analysis available."),
        citations=groq_result.get("citations", [])
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return assistant_msg

@router.get("/cases/{case_id}/conversations", response_model=List[ChatMessageResponse])
def get_case_conversations(
    case_id: str,
    conversation_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    case = db.query(CaseModel).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    query = db.query(ChatMessageModel).filter_by(case_id=case_id)
    if conversation_id:
        query = query.filter_by(conversation_id=conversation_id)

    messages = query.order_by(ChatMessageModel.created_at.asc()).all()
    return messages
