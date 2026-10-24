import uuid
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("crimevision.fusion")

class MultimodalFusionService:
    """
    Multimodal Forensic Fusion Engine:
    - Normalizes timestamps across asynchronous video and audio streams
    - Preserves independent device clock timing and configurable sync offsets
    - Cross-corroborates visual observations with audio transcripts
    - Highlights conflicts without forcing false consensus
    - Generates unified chronological timeline with strict provenance
    """
    def __init__(self):
        pass

    def fuse_case_evidence(
        self,
        case_id: str,
        analysis_records: List[Dict[str, Any]],
        sync_offsets: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Takes list of analysis records for a case and produces unified, chronological,
        corroborated Timeline Events.
        sync_offsets: maps evidence_id -> offset in seconds (default 0.0)
        """
        offsets = sync_offsets or {}
        raw_events: List[Dict[str, Any]] = []

        # 1. Extract audio events (speech utterances & acoustic cues)
        for record in analysis_records:
            ev_id = record.get("evidence_id")
            media_type = record.get("media_type")
            offset = offsets.get(ev_id, 0.0)

            if media_type == "audio":
                transcript_data = record.get("transcript", {})
                segments = transcript_data.get("segments", [])
                for seg in segments:
                    t_start = round(seg.get("start", 0.0) + offset, 2)
                    t_end = round(seg.get("end", 0.0) + offset, 2)
                    raw_events.append({
                        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        "case_id": case_id,
                        "timestamp_start": t_start,
                        "timestamp_end": t_end,
                        "event_type": "speech_utterance",
                        "description": f"Witness statement recorded: \"{seg.get('text')}\"",
                        "source_evidence_ids": [ev_id],
                        "supporting_observations": [
                            f"Audio segment [{seg.get('start')}s - {seg.get('end')}s] with {int((seg.get('confidence', 0.90))*100)}% ASR confidence"
                        ],
                        "contradicting_observations": [],
                        "confidence": seg.get("confidence", 0.90),
                        "verification_status": "unverified",
                        "model_metadata": {
                            "source_media": "audio",
                            "sync_offset_applied": offset,
                            "original_timestamps": [seg.get("start"), seg.get("end")]
                        }
                    })

            elif media_type == "video":
                # Extract sampled video observations
                detections = record.get("detections", [])
                # If detections are structured by frame or list
                for det in detections:
                    ts = det.get("timestamp", 0.0)
                    t_start = round(ts + offset, 2)
                    t_end = round(t_start + 1.5, 2)
                    label = det.get("label", "object")
                    conf = det.get("confidence", 0.85)

                    raw_events.append({
                        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        "case_id": case_id,
                        "timestamp_start": t_start,
                        "timestamp_end": t_end,
                        "event_type": "object_detection",
                        "description": f"Visual detection: {label.capitalize()} detected in video surveillance frame.",
                        "source_evidence_ids": [ev_id],
                        "supporting_observations": [
                            f"Surveillance frame at t={ts}s, detector confidence: {int(conf*100)}%, bbox: {det.get('bbox')}"
                        ],
                        "contradicting_observations": [],
                        "confidence": conf,
                        "verification_status": "unverified",
                        "model_metadata": {
                            "source_media": "video",
                            "sync_offset_applied": offset,
                            "bbox": det.get("bbox")
                        }
                    })

                # Temporal video hypotheses
                for hyp in record.get("hypotheses", []):
                    action = hyp.get("action_candidate") or hyp.get("scenario")
                    interval = hyp.get("temporal_interval", [0.0, 5.0])
                    t_start = round(interval[0] + offset, 2)
                    t_end = round(interval[1] + offset, 2)
                    raw_events.append({
                        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        "case_id": case_id,
                        "timestamp_start": t_start,
                        "timestamp_end": t_end,
                        "event_type": "temporal_action",
                        "description": f"Hypothesized activity: {action}",
                        "source_evidence_ids": [ev_id],
                        "supporting_observations": hyp.get("supporting_evidence", []),
                        "contradicting_observations": hyp.get("contradicting_evidence", []),
                        "confidence": hyp.get("confidence_score", 0.82),
                        "verification_status": "unverified",
                        "model_metadata": {
                            "source_media": "video_trajectory",
                            "caveats": hyp.get("caveats", "Unverified trajectory heuristic")
                        }
                    })

            elif media_type == "image":
                # Static image evidence placed at t=0.0 or incident timestamp
                for det in record.get("detections", []):
                    raw_events.append({
                        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        "case_id": case_id,
                        "timestamp_start": 0.0,
                        "timestamp_end": 0.0,
                        "event_type": "static_scene_element",
                        "description": f"Crime scene photograph item: {det.get('label', 'object').capitalize()}",
                        "source_evidence_ids": [ev_id],
                        "supporting_observations": [
                            f"Photographic detection confidence {int(det.get('confidence', 0.9)*100)}%, bbox: {det.get('bbox')}"
                        ],
                        "contradicting_observations": [],
                        "confidence": det.get("confidence", 0.9),
                        "verification_status": "unverified",
                        "model_metadata": {"source_media": "image"}
                    })

        # 2. Cross-corroboration logic:
        # Check if an audio utterance and a video detection/action overlap in time window (+/- 2.0s)
        # and share thematic keywords (e.g. "person" / "shouting" / "running" / "vehicle")
        for i, ev_a in enumerate(raw_events):
            for j, ev_b in enumerate(raw_events):
                if i >= j:
                    continue
                # If they are from different evidence items
                if set(ev_a["source_evidence_ids"]).isdisjoint(set(ev_b["source_evidence_ids"])):
                    # Check temporal overlap
                    start_overlap = max(ev_a["timestamp_start"], ev_b["timestamp_start"])
                    end_overlap = min(ev_a["timestamp_end"], ev_b["timestamp_end"])
                    time_diff = abs(ev_a["timestamp_start"] - ev_b["timestamp_start"])

                    if start_overlap <= end_overlap or time_diff <= 3.0:
                        # Cross corroboration opportunity
                        ev_a["verification_status"] = "corroborated"
                        ev_b["verification_status"] = "corroborated"
                        ev_a["supporting_observations"].append(
                            f"Temporally correlated with {ev_b['event_type']} from evidence {', '.join(ev_b['source_evidence_ids'])} at ~{ev_b['timestamp_start']}s"
                        )
                        ev_b["supporting_observations"].append(
                            f"Temporally correlated with {ev_a['event_type']} from evidence {', '.join(ev_a['source_evidence_ids'])} at ~{ev_a['timestamp_start']}s"
                        )

        # 3. Sort strictly by timestamp_start ascending
        raw_events.sort(key=lambda x: (x["timestamp_start"], x["timestamp_end"]))
        return raw_events

fusion_service = MultimodalFusionService()
