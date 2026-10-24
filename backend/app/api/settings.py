import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.database import get_db
from app.models.schemas import CaseModel, EvidenceModel, AnalysisResultModel, TimelineEventModel
from app.services.fusion import fusion_service

router = APIRouter()

class SettingsUpdate(BaseModel):
    ai_mode: Optional[str] = None
    groq_model: Optional[str] = None
    device: Optional[str] = None

@router.get("/settings")
def get_system_settings():
    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "api_prefix": settings.API_PREFIX,
        "ai_mode": settings.AI_MODE,
        "groq_model": settings.GROQ_MODEL,
        "groq_key_configured": bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 5),
        "device": settings.DEVICE,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "storage_dir": settings.STORAGE_DIR,
        "database_type": "SQLite (Local)" if settings.DATABASE_URL.startswith("sqlite") else "PostgreSQL (Production)"
    }

@router.post("/settings")
def update_system_settings(payload: SettingsUpdate):
    if payload.ai_mode in ["DEMO", "LOCAL_AI", "GROQ"]:
        settings.AI_MODE = payload.ai_mode
    if payload.groq_model:
        settings.GROQ_MODEL = payload.groq_model
    if payload.device in ["cpu", "cuda"]:
        settings.DEVICE = payload.device
    return {
        "status": "updated",
        "ai_mode": settings.AI_MODE,
        "groq_model": settings.GROQ_MODEL,
        "device": settings.DEVICE
    }

@router.post("/demo/seed")
def seed_demo_forensic_case(db: Session = Depends(get_db)):
    """
    Seeds a rich, realistic forensic demonstration case complete with:
    - CCTV camera footage analysis
    - Crime scene photographic evidence
    - Witness audio recording transcript
    - Multimodal cross-corroborated timeline
    """
    existing_demo = db.query(CaseModel).filter_by(title="Investigation 2026-F09: Downtown Jewelry Vault Intrusion").first()
    if existing_demo:
        return {"status": "exists", "case_id": existing_demo.id}

    case_id = f"CASE-DEMO-{uuid.uuid4().hex[:6].upper()}"
    demo_case = CaseModel(
        id=case_id,
        title="Investigation 2026-F09: Downtown Jewelry Vault Intrusion",
        description="Forensic investigation into reported night breach at 410 Diamond Arcade. Multi-sensor CCTV, alleyway bystander audio, and interior perimeter snapshots captured.",
        incident_date="2026-10-23 23:45:00",
        location="410 Diamond Arcade, Sector 4, Metro Central",
        lead_investigator="Senior Special Agent Vance",
        status="OPEN",
        audit_trail=[
            {
                "timestamp": datetime.utcnow().isoformat(),
                "action": "DEMO_CASE_INITIALIZED",
                "actor": "Forensic Admin",
                "detail": "Standard multimodal validation dossier populated"
            }
        ]
    )
    db.add(demo_case)
    db.flush()

    # Evidence 1: Surveillance Video
    ev_video = EvidenceModel(
        id=f"EVD-VID-{uuid.uuid4().hex[:6].upper()}",
        case_id=case_id,
        filename="cctv_cam04_perimeter.mp4",
        original_name="cctv_cam04_perimeter.mp4",
        media_type="video",
        file_path="mock/cctv_cam04_perimeter.mp4",
        file_size_bytes=14520800,
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        mime_type="video/mp4",
        metadata_info={"fps": 30, "duration": 18.0, "resolution": "1920x1080"},
        analysis_status="COMPLETED"
    )
    db.add(ev_video)

    # Evidence 2: High-Resolution Crime Scene Image
    ev_image = EvidenceModel(
        id=f"EVD-IMG-{uuid.uuid4().hex[:6].upper()}",
        case_id=case_id,
        filename="vault_corridor_still.jpg",
        original_name="vault_corridor_still.jpg",
        media_type="image",
        file_path="mock/vault_corridor_still.jpg",
        file_size_bytes=3841200,
        sha256_hash="8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
        mime_type="image/jpeg",
        metadata_info={"width": 3840, "height": 2160, "iso": 800},
        analysis_status="COMPLETED"
    )
    db.add(ev_image)

    # Evidence 3: Witness Audio Statement
    ev_audio = EvidenceModel(
        id=f"EVD-AUD-{uuid.uuid4().hex[:6].upper()}",
        case_id=case_id,
        filename="witness_bystander_statement.wav",
        original_name="witness_bystander_statement.wav",
        media_type="audio",
        file_path="mock/witness_bystander_statement.wav",
        file_size_bytes=5210400,
        sha256_hash="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        mime_type="audio/wav",
        metadata_info={"channels": 1, "sample_rate": 44100, "duration": 14.2},
        analysis_status="COMPLETED"
    )
    db.add(ev_audio)
    db.flush()

    # Analysis 1: Video
    anl_video = AnalysisResultModel(
        evidence_id=ev_video.id,
        case_id=case_id,
        media_type="video",
        detections=[
            {"label": "person", "confidence": 0.93, "bbox": [280, 180, 520, 780], "timestamp": 2.5, "track_id": "TRK-01"},
            {"label": "backpack", "confidence": 0.88, "bbox": [320, 240, 480, 480], "timestamp": 4.0, "track_id": "TRK-02"},
            {"label": "person", "confidence": 0.95, "bbox": [480, 200, 740, 810], "timestamp": 6.5, "track_id": "TRK-01"}
        ],
        scene_labels=[
            {"label": "commercial retail counter", "similarity_score": 0.91},
            {"label": "corridor or stairwell", "similarity_score": 0.82}
        ],
        caption="Security surveillance video monitoring access door to vault room.",
        observations=[
            "Subject identified as TRK-01 enters frame at t=2.5s wearing dark utility outerwear.",
            "Carried container (backpack) confirmed present on subject at t=4.0s.",
            "Subject accelerates gait towards secondary egress corridor at t=6.5s."
        ],
        hypotheses=[
            {
                "hypothesis_id": "DEMO-H1",
                "action_candidate": "Unauthorized entry and swift transit",
                "temporal_interval": [2.5, 7.0],
                "confidence_score": 0.92,
                "supporting_evidence": ["Rapid translation of bounding box across security threshold."]
            }
        ],
        limitations=["Night vision infrared illumination limits color differentiation on clothing fabric."]
    )
    db.add(anl_video)

    # Analysis 2: Image
    anl_image = AnalysisResultModel(
        evidence_id=ev_image.id,
        case_id=case_id,
        media_type="image",
        detections=[
            {"label": "person", "confidence": 0.96, "bbox": [640, 420, 1180, 1890], "is_weapon_candidate": False},
            {"label": "cell phone", "confidence": 0.84, "bbox": [880, 890, 1020, 1110], "is_weapon_candidate": False}
        ],
        scene_labels=[
            {"label": "corridor or stairwell", "similarity_score": 0.94},
            {"label": "indoor residential room", "similarity_score": 0.43}
        ],
        caption="High-resolution flash still of secure vault threshold vestibule.",
        observations=[
            "Primary subject standing upright adjacent to biometric security door keypad.",
            "Handheld object in right grasp consistent with consumer smartphone profile (aspect ratio 2.1:1).",
            "Zero standard weapon classes (knife/edged weapon) detected in field of view."
        ],
        hypotheses=[
            {
                "hypothesis_id": "IMG-H1",
                "scenario": "Subject utilized mobile electronic device near keypad terminal.",
                "supporting_evidence": ["Object detected at coordinates [880, 890, 1020, 1110] held towards panel."]
            }
        ],
        limitations=["Direct flashlight glare at upper quadrant causes minor reflection artifact."]
    )
    db.add(anl_image)

    # Analysis 3: Audio
    anl_audio = AnalysisResultModel(
        evidence_id=ev_audio.id,
        case_id=case_id,
        media_type="audio",
        detections=[],
        transcript={
            "language": "en",
            "segments": [
                {
                    "start": 1.2,
                    "end": 4.5,
                    "text": "I was waiting outside by the coffee stall when the glass alarm started ringing.",
                    "speaker": None,
                    "confidence": 0.96
                },
                {
                    "start": 5.0,
                    "end": 8.8,
                    "text": "A person came bursting out the side door holding a heavy bag over their shoulder.",
                    "speaker": None,
                    "confidence": 0.92
                },
                {
                    "start": 9.2,
                    "end": 13.0,
                    "text": "They turned right onto Elm Street heading toward the metro subway station.",
                    "speaker": None,
                    "confidence": 0.94
                }
            ]
        },
        observations=[
            "Witness auditory testimony captured: mentions acoustic alarm trigger at t=1.2s.",
            "Description of fleeing individual corroborates bag carrier observed in video surveillance.",
            "Direction of travel reported: Elm Street toward public transit."
        ],
        hypotheses=[
            {
                "hypothesis_id": "AUD-H1",
                "scenario": "Egress occurred immediately following alarm activation.",
                "supporting_evidence": ["Temporal continuity between acoustic alarm report and egress description."]
            }
        ],
        limitations=["Bystander statement is subject to auditory recall variance and acoustic street noise."]
    )
    db.add(anl_audio)
    db.flush()

    # Generate Cross-Corroborated Timeline
    records = [
        {
            "evidence_id": ev_video.id,
            "media_type": "video",
            "detections": anl_video.detections,
            "hypotheses": anl_video.hypotheses,
            "observations": anl_video.observations
        },
        {
            "evidence_id": ev_image.id,
            "media_type": "image",
            "detections": anl_image.detections,
            "hypotheses": anl_image.hypotheses,
            "observations": anl_image.observations
        },
        {
            "evidence_id": ev_audio.id,
            "media_type": "audio",
            "transcript": anl_audio.transcript,
            "observations": anl_audio.observations
        }
    ]

    fused_events = fusion_service.fuse_case_evidence(case_id, records)
    for fevt in fused_events:
        db.add(TimelineEventModel(
            id=fevt["event_id"],
            case_id=case_id,
            timestamp_start=fevt["timestamp_start"],
            timestamp_end=fevt["timestamp_end"],
            event_type=fevt["event_type"],
            description=fevt["description"],
            source_evidence_ids=fevt["source_evidence_ids"],
            supporting_observations=fevt["supporting_observations"],
            contradicting_observations=fevt["contradicting_observations"],
            confidence=fevt["confidence"],
            verification_status=fevt["verification_status"],
            model_metadata=fevt["model_metadata"]
        ))

    db.commit()

    return {
        "status": "seeded",
        "case_id": case_id,
        "title": demo_case.title,
        "evidence_count": 3,
        "timeline_events_count": len(fused_events)
    }
