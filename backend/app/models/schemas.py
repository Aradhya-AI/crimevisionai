import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field

from app.database import Base

# ==========================================
# SQLAlchemy Models
# ==========================================

class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, default=lambda: f"CASE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    incident_date = Column(String(64), nullable=True)
    location = Column(String(255), nullable=True)
    lead_investigator = Column(String(128), nullable=True, default="Investigator")
    status = Column(String(32), default="OPEN")  # OPEN, UNDER_REVIEW, CLOSED
    audit_trail = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidence_items = relationship("EvidenceModel", back_populates="case", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEventModel", back_populates="case", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessageModel", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("ReportModel", back_populates="case", cascade="all, delete-orphan")


class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(String(64), primary_key=True, default=lambda: f"EVD-{uuid.uuid4().hex[:8].upper()}")
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    media_type = Column(String(32), nullable=False)  # image, video, audio, document
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    sha256_hash = Column(String(64), nullable=False)
    mime_type = Column(String(128), default="application/octet-stream")
    metadata_info = Column(JSON, default=dict)
    analysis_status = Column(String(32), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="evidence_items")
    analysis = relationship("AnalysisResultModel", back_populates="evidence", uselist=False, cascade="all, delete-orphan")


class AnalysisResultModel(Base):
    __tablename__ = "analysis_results"

    id = Column(String(64), primary_key=True, default=lambda: f"ANL-{uuid.uuid4().hex[:8].upper()}")
    evidence_id = Column(String(64), ForeignKey("evidence.id", ondelete="CASCADE"), unique=True, nullable=False)
    case_id = Column(String(64), nullable=False)
    media_type = Column(String(32), nullable=False)
    detections = Column(JSON, default=list)
    scene_labels = Column(JSON, default=list)
    caption = Column(Text, default="")
    transcript = Column(JSON, default=dict)
    observations = Column(JSON, default=list)
    hypotheses = Column(JSON, default=list)
    limitations = Column(JSON, default=list)
    model_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    evidence = relationship("EvidenceModel", back_populates="analysis")


class TimelineEventModel(Base):
    __tablename__ = "timeline_events"

    id = Column(String(64), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    timestamp_start = Column(Float, nullable=False, default=0.0)
    timestamp_end = Column(Float, nullable=False, default=0.0)
    event_type = Column(String(64), nullable=False)  # object_detection, speech_utterance, temporal_action, anomaly
    description = Column(Text, nullable=False)
    source_evidence_ids = Column(JSON, default=list)
    supporting_observations = Column(JSON, default=list)
    contradicting_observations = Column(JSON, default=list)
    confidence = Column(Float, nullable=True)
    verification_status = Column(String(32), default="unverified")  # unverified, corroborated, conflicting
    model_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="timeline_events")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, default=lambda: f"MSG-{uuid.uuid4().hex[:8].upper()}")
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="chat_messages")


class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, default=lambda: f"RPT-{uuid.uuid4().hex[:8].upper()}")
    case_id = Column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(32), default="PENDING")  # PENDING, READY, FAILED
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    included_sections = Column(JSON, default=list)
    investigator_name = Column(String(128), default="Investigator")
    notes = Column(Text, default="")
    sha256_hash = Column(String(64), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="reports")


class ProcessingJobModel(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(64), primary_key=True, default=lambda: f"JOB-{uuid.uuid4().hex[:8].upper()}")
    evidence_id = Column(String(64), nullable=False)
    case_id = Column(String(64), nullable=False)
    status = Column(String(32), default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress_pct = Column(Integer, default=0)
    message = Column(String(255), default="Job initialized")
    error_detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==========================================
# Pydantic Request / Response Schemas
# ==========================================

class CaseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = ""
    incident_date: Optional[str] = ""
    location: Optional[str] = ""
    lead_investigator: Optional[str] = "Lead Forensic Analyst"

class CaseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    incident_date: Optional[str]
    location: Optional[str]
    lead_investigator: Optional[str]
    status: str
    audit_trail: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    evidence_count: Optional[int] = 0

    class Config:
        from_attributes = True

class EvidenceResponse(BaseModel):
    id: str
    case_id: str
    filename: str
    original_name: str
    media_type: str
    file_size_bytes: int
    sha256_hash: str
    mime_type: str
    metadata_info: Dict[str, Any] = {}
    analysis_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: List[float] = []  # [x1, y1, x2, y2]
    track_id: Optional[Union[int, str]] = None
    timestamp: Optional[float] = None
    frame_number: Optional[int] = None
    is_weapon_candidate: Optional[bool] = False

class SceneLabelItem(BaseModel):
    label: str
    similarity_score: float

class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: Optional[str] = None
    confidence: Optional[float] = None

class AnalysisResultResponse(BaseModel):
    id: str
    evidence_id: str
    case_id: str
    media_type: str
    detections: List[Dict[str, Any]] = []
    scene_labels: List[Dict[str, Any]] = []
    caption: str = ""
    transcript: Dict[str, Any] = {}
    observations: List[str] = []
    hypotheses: List[Dict[str, Any]] = []
    limitations: List[str] = []
    model_metadata: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class TimelineEventCreate(BaseModel):
    timestamp_start: float
    timestamp_end: float
    event_type: str
    description: str
    source_evidence_ids: List[str] = []
    supporting_observations: List[str] = []
    contradicting_observations: List[str] = []
    confidence: Optional[float] = None
    verification_status: str = "unverified"
    model_metadata: Dict[str, Any] = {}

class TimelineEventResponse(BaseModel):
    id: str
    case_id: str
    timestamp_start: float
    timestamp_end: float
    event_type: str
    description: str
    source_evidence_ids: List[str] = []
    supporting_observations: List[str] = []
    contradicting_observations: List[str] = []
    confidence: Optional[float] = None
    verification_status: str
    model_metadata: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class ChatQueryRequest(BaseModel):
    question: str = Field(..., min_length=2)
    conversation_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str
    case_id: str
    conversation_id: str
    role: str
    content: str
    citations: List[Dict[str, Any]] = []
    created_at: datetime

    class Config:
        from_attributes = True

class ReportCreateRequest(BaseModel):
    title: Optional[str] = "Forensic Multimodal Examination Report"
    included_sections: List[str] = ["case_metadata", "evidence_hashes", "detections", "timeline", "hypotheses", "limitations", "signoff"]
    investigator_name: Optional[str] = "Senior Forensic Examiner"
    notes: Optional[str] = ""

class ReportResponse(BaseModel):
    id: str
    case_id: str
    title: str
    status: str
    file_size_bytes: int
    sha256_hash: str
    investigator_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class JobStatusResponse(BaseModel):
    id: str
    evidence_id: str
    case_id: str
    status: str
    progress_pct: int
    message: str
    error_detail: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
