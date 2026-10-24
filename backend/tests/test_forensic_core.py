import os
import io
import pytest
from pathlib import Path
from PIL import Image

from app.services.storage import storage_service, sanitize_filename
from app.services.image_analysis import image_analysis_engine
from app.services.audio_analysis import audio_analysis_engine
from app.services.video_analysis import video_analysis_engine
from app.services.fusion import fusion_service
from app.services.groq_service import groq_forensic_service
from app.services.report_service import report_generator_service

def test_sanitize_filename():
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("crime scene #1 (night).jpg") == "crime_scene__1__night_.jpg"
    assert sanitize_filename("") == "unnamed_evidence"

def test_sha256_calculation(tmp_path):
    test_file = tmp_path / "sample_evidence.bin"
    test_content = b"CRIME_SCENE_INTEGRITY_CHECK_FORENSIC_BUFFER"
    test_file.write_bytes(test_content)

    calc_hash = storage_service.calculate_sha256(test_file)
    in_memory_hash = storage_service.calculate_bytes_sha256(test_content)
    
    assert len(calc_hash) == 64
    assert calc_hash == in_memory_hash

def test_image_analysis_pipeline(tmp_path):
    # Create test image
    img_file = tmp_path / "test_scene.jpg"
    img = Image.new("RGB", (640, 480), color=(50, 60, 70))
    img.save(img_file, format="JPEG")

    result = image_analysis_engine.analyze_image("EVD-TEST-IMG", str(img_file))
    
    assert result["media_type"] == "image"
    assert len(result["detections"]) > 0
    # Verify bounding box validity: [x1, y1, x2, y2] with x1 < x2 and y1 < y2
    for det in result["detections"]:
        bbox = det["bbox"]
        assert len(bbox) == 4
        assert bbox[0] < bbox[2]
        assert bbox[1] < bbox[3]
    assert len(result["observations"]) > 0
    assert len(result["limitations"]) > 0

def test_audio_analysis_pipeline(tmp_path):
    # Dummy audio file
    audio_file = tmp_path / "witness_statement.wav"
    audio_file.write_bytes(b"RIFF....WAVEfmt ....data....")

    result = audio_analysis_engine.transcribe_audio("EVD-TEST-AUD", str(audio_file))
    assert result["media_type"] == "audio"
    assert len(result["segments"]) > 0
    # Verify segment timestamp ordering
    for seg in result["segments"]:
        assert seg["start"] <= seg["end"]
        assert seg["speaker"] is None  # Diarization caveat enforced!
    assert "observations" in result

def test_video_analysis_pipeline(tmp_path):
    video_file = tmp_path / "surveillance.mp4"
    video_file.write_bytes(b"dummy_mp4_binary")

    result = video_analysis_engine.analyze_video("EVD-TEST-VID", str(video_file), sample_interval_sec=1.5)
    assert result["media_type"] == "video"
    assert result["sampled_frame_count"] > 0
    for frame_obs in result["frame_observations"]:
        assert "timestamp_seconds" in frame_obs
        assert "detections" in frame_obs
    assert len(result["limitations"]) > 0

def test_multimodal_fusion_corroboration():
    case_id = "CASE-TEST-FUSION"
    analysis_records = [
        {
            "evidence_id": "EVD-VID-1",
            "media_type": "video",
            "detections": [
                {"label": "person", "confidence": 0.94, "bbox": [100, 100, 200, 300], "timestamp": 3.0}
            ],
            "hypotheses": [
                {"action_candidate": "Individual running past camera", "temporal_interval": [2.5, 5.0], "confidence_score": 0.88}
            ]
        },
        {
            "evidence_id": "EVD-AUD-1",
            "media_type": "audio",
            "transcript": {
                "segments": [
                    {"start": 3.2, "end": 5.5, "text": "Someone dashed down the corridor!", "confidence": 0.91}
                ]
            }
        }
    ]

    events = fusion_service.fuse_case_evidence(case_id, analysis_records)
    assert len(events) >= 2
    # Verify sorted strictly ascending by timestamp_start
    for i in range(len(events) - 1):
        assert events[i]["timestamp_start"] <= events[i+1]["timestamp_start"]

    # Verify cross-corroboration occurred between video and audio
    corroborated_events = [e for e in events if e["verification_status"] == "corroborated"]
    assert len(corroborated_events) >= 2

def test_groq_grounding_and_uncertainty():
    case_info = {"id": "CASE-101", "title": "Storefront Burglary", "location": "Maple Ave"}
    evidence_list = [{"id": "EVD-01", "media_type": "image", "original_name": "scene.jpg"}]
    analysis_records = [
        {
            "evidence_id": "EVD-01",
            "media_type": "image",
            "caption": "Night view of retail entryway",
            "detections": [{"label": "cell phone", "confidence": 0.85, "bbox": [10, 20, 30, 40]}]
        }
    ]
    timeline_events = [
        {"timestamp_start": 4.0, "timestamp_end": 5.0, "source_evidence_ids": ["EVD-01"], "event_type": "detection", "description": "Subject present", "verification_status": "unverified"}
    ]

    # Query for weapons - must acknowledge absence rather than fabricating
    weapon_res = groq_forensic_service.answer_query(
        question="Was a gun or knife found in the evidence?",
        case_info=case_info,
        evidence_list=evidence_list,
        analysis_records=analysis_records,
        timeline_events=timeline_events
    )
    assert "standard pretrained detectors did not identify confirmed firearms" in weapon_res["answer"].lower() or "not established" in weapon_res["answer"].lower()

def test_pdf_report_generation(tmp_path):
    report_id = "RPT-TEST-001"
    case_info = {"id": "CASE-TEST-PDF", "title": "Downtown Incident", "incident_date": "2026-10-24", "location": "Central Ave"}
    evidence_list = [
        {"id": "EVD-01", "media_type": "image", "original_name": "photo.jpg", "sha256_hash": "a"*64, "file_size_bytes": 1024}
    ]
    analysis_records = [
        {"evidence_id": "EVD-01", "media_type": "image", "caption": "Scene photograph", "detections": [{"label": "person", "confidence": 0.95}], "observations": ["Individual observed"]}
    ]
    timeline_events = [
        {"timestamp_start": 0.0, "timestamp_end": 0.0, "event_type": "static_detection", "description": "Subject located", "verification_status": "unverified"}
    ]

    pdf_path = report_generator_service.generate_pdf(
        report_id=report_id,
        case_info=case_info,
        evidence_list=evidence_list,
        analysis_records=analysis_records,
        timeline_events=timeline_events
    )

    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 500  # Substantial PDF document generated
