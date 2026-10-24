import uuid
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.database import SessionLocal
from app.models.schemas import ProcessingJobModel, EvidenceModel, AnalysisResultModel
from app.services.image_analysis import image_analysis_engine
from app.services.video_analysis import video_analysis_engine
from app.services.audio_analysis import audio_analysis_engine
from app.services.fusion import fusion_service
from app.models.schemas import TimelineEventModel

logger = logging.getLogger("crimevision.jobs")

class BackgroundJobManager:
    def __init__(self):
        self._running_tasks: Dict[str, asyncio.Task] = {}

    def start_evidence_analysis(self, job_id: str, evidence_id: str, case_id: str):
        """Dispatches evidence analysis to async background task."""
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(self._run_analysis_job(job_id, evidence_id, case_id))
            self._running_tasks[job_id] = task
        except RuntimeError:
            # Fallback if called outside event loop thread
            import threading
            def runner():
                asyncio.run(self._run_analysis_job(job_id, evidence_id, case_id))
            t = threading.Thread(target=runner, daemon=True)
            t.start()

    async def _run_analysis_job(self, job_id: str, evidence_id: str, case_id: str):
        db = SessionLocal()
        try:
            job = db.query(ProcessingJobModel).filter_by(id=job_id).first()
            if not job:
                return
            job.status = "RUNNING"
            job.progress_pct = 10
            job.message = "Initializing forensic pipeline..."
            db.commit()

            evidence = db.query(EvidenceModel).filter_by(id=evidence_id).first()
            if not evidence:
                job.status = "FAILED"
                job.error_detail = "Evidence not found"
                db.commit()
                return

            evidence.analysis_status = "PROCESSING"
            db.commit()

            analysis_output = {}

            # Execute based on media_type
            if evidence.media_type == "image":
                job.progress_pct = 40
                job.message = "Executing RT-DETR detection and CLIP scene classification..."
                db.commit()
                await asyncio.sleep(0.5)

                analysis_output = image_analysis_engine.analyze_image(
                    evidence_id=evidence.id,
                    image_path=evidence.file_path,
                    case_id=case_id
                )

            elif evidence.media_type == "audio":
                job.progress_pct = 40
                job.message = "Executing Whisper multilingual speech transcription..."
                db.commit()
                await asyncio.sleep(0.5)

                analysis_output = audio_analysis_engine.transcribe_audio(
                    evidence_id=evidence.id,
                    audio_path=evidence.file_path,
                    case_id=case_id
                )

            elif evidence.media_type == "video":
                def update_progress(pct: int, msg: str):
                    job.progress_pct = pct
                    job.message = msg
                    db.commit()

                analysis_output = video_analysis_engine.analyze_video(
                    evidence_id=evidence.id,
                    video_path=evidence.file_path,
                    case_id=case_id,
                    progress_callback=update_progress
                )
            else:
                analysis_output = {
                    "evidence_id": evidence.id,
                    "media_type": evidence.media_type,
                    "observations": ["Non-media forensic document / binary artifact registered."],
                    "limitations": ["Visual/Audio models inapplicable to document files."]
                }

            job.progress_pct = 85
            job.message = "Persisting forensic detections and updating evidence record..."
            db.commit()

            # Store Analysis Result in DB
            existing_anl = db.query(AnalysisResultModel).filter_by(evidence_id=evidence.id).first()
            if existing_anl:
                db.delete(existing_anl)
                db.flush()

            # Flatten detections if necessary
            detections = analysis_output.get("detections", [])
            if not detections and "frame_observations" in analysis_output:
                for f_obs in analysis_output.get("frame_observations", []):
                    for d in f_obs.get("detections", []):
                        d_copy = dict(d)
                        d_copy["timestamp"] = f_obs.get("timestamp_seconds")
                        detections.append(d_copy)

            anl_record = AnalysisResultModel(
                evidence_id=evidence.id,
                case_id=case_id,
                media_type=evidence.media_type,
                detections=detections,
                scene_labels=analysis_output.get("scene_labels", []),
                caption=analysis_output.get("caption", ""),
                transcript=analysis_output.get("transcript", {}) or {
                    "segments": analysis_output.get("segments", []),
                    "language": analysis_output.get("language", "en")
                },
                observations=analysis_output.get("observations", []),
                hypotheses=analysis_output.get("hypotheses", []) or analysis_output.get("temporal_hypotheses", []),
                limitations=analysis_output.get("limitations", []),
                model_metadata=analysis_output.get("model_metadata", {})
            )
            db.add(anl_record)

            evidence.analysis_status = "COMPLETED"
            db.commit()

            # Update fused timeline for case
            job.progress_pct = 95
            job.message = "Updating case multimodal timeline..."
            db.commit()

            all_analyses = db.query(AnalysisResultModel).filter_by(case_id=case_id).all()
            analysis_dicts = [
                {
                    "evidence_id": a.evidence_id,
                    "media_type": a.media_type,
                    "detections": a.detections or [],
                    "scene_labels": a.scene_labels or [],
                    "caption": a.caption or "",
                    "transcript": a.transcript or {},
                    "observations": a.observations or [],
                    "hypotheses": a.hypotheses or [],
                    "limitations": a.limitations or []
                }
                for a in all_analyses
            ]

            fused_events = fusion_service.fuse_case_evidence(case_id, analysis_dicts)
            # Remove previous events for this evidence or refresh
            db.query(TimelineEventModel).filter_by(case_id=case_id).delete()
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

            job.status = "COMPLETED"
            job.progress_pct = 100
            job.message = "Analysis complete."
            db.commit()

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            job = db.query(ProcessingJobModel).filter_by(id=job_id).first()
            if job:
                job.status = "FAILED"
                job.error_detail = str(e)
                job.message = f"Analysis error: {str(e)[:100]}"
                db.commit()
            evidence = db.query(EvidenceModel).filter_by(id=evidence_id).first()
            if evidence:
                evidence.analysis_status = "FAILED"
                db.commit()
        finally:
            db.close()
            self._running_tasks.pop(job_id, None)

    def cancel_job(self, job_id: str) -> bool:
        if job_id in self._running_tasks:
            self._running_tasks[job_id].cancel()
            db = SessionLocal()
            job = db.query(ProcessingJobModel).filter_by(id=job_id).first()
            if job:
                job.status = "CANCELLED"
                job.message = "Job cancelled by investigator"
                db.commit()
            db.close()
            return True
        return False

background_job_manager = BackgroundJobManager()
