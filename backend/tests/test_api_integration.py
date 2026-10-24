import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_api_health_and_diagnostics():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data
    assert "uptime_seconds" in data

    diag = client.get("/api/diagnostics")
    assert diag.status_code == 200
    diag_data = diag.json()
    assert "hardware" in diag_data
    assert "model_engines" in diag_data

def test_full_case_evidence_lifecycle():
    # 1. Create Case
    create_res = client.post(
        "/api/cases",
        json={
            "title": "Automated Unit Test Investigation",
            "description": "Validation of full forensic pipeline",
            "incident_date": "2026-10-24",
            "location": "Cyber Forensics Lab",
            "lead_investigator": "Test Examiner"
        }
    )
    assert create_res.status_code == 201
    case = create_res.json()
    case_id = case["id"]
    assert case["title"] == "Automated Unit Test Investigation"

    # 2. Upload Evidence
    file_bytes = b"MOCK_FORENSIC_IMAGE_DATA_BYTES_FOR_UPLOAD"
    files = {"file": ("test_surveillance_frame.jpg", io.BytesIO(file_bytes), "image/jpeg")}
    upload_res = client.post(f"/api/cases/{case_id}/evidence", files=files)
    assert upload_res.status_code == 201
    evidence = upload_res.json()
    evidence_id = evidence["id"]
    assert evidence["media_type"] == "image"
    assert len(evidence["sha256_hash"]) == 64

    # 3. List Case Evidence
    list_res = client.get(f"/api/cases/{case_id}/evidence")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(i["id"] == evidence_id for i in items)

    # 4. Trigger Analysis
    analyze_res = client.post(f"/api/evidence/{evidence_id}/analyze")
    assert analyze_res.status_code == 200
    job = analyze_res.json()
    assert job["evidence_id"] == evidence_id
    assert job["status"] in ["QUEUED", "RUNNING", "COMPLETED"]

    # 5. Ask Chatbot about Case
    chat_res = client.post(
        f"/api/cases/{case_id}/chat",
        json={"question": "What evidence has been uploaded so far?"}
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "content" in chat_data
    assert len(chat_data["content"]) > 0

    # 6. Generate Forensic PDF Report
    report_res = client.post(
        f"/api/cases/{case_id}/reports",
        json={
            "title": "Unit Test Forensic Dossier",
            "investigator_name": "Test Examiner",
            "notes": "Automated test sign-off note"
        }
    )
    assert report_res.status_code == 201
    report = report_res.json()
    report_id = report["id"]
    assert report["status"] == "READY"
    assert len(report["sha256_hash"]) == 64

    # 7. Download PDF Report
    download_res = client.get(f"/api/reports/{report_id}/download")
    assert download_res.status_code == 200
    assert download_res.headers["content-type"] == "application/pdf"
    assert len(download_res.content) > 500

def test_demo_seed_endpoint():
    res = client.post("/api/demo/seed")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["seeded", "exists"]
    assert "case_id" in data
