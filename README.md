# CrimeVision AI — Intelligent Multimodal Forensic Analysis Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r160+-000000.svg?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.13-3776AB.svg?style=flat&logo=python&logoColor=white)](https://python.org)
[![Pytest](https://img.shields.io/badge/Tests-11%20Passed-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](https://pytest.org)

**CrimeVision AI** is a decision-support platform designed for law enforcement agencies, cybercrime units, and digital forensics laboratories. The system ingests multi-sensor physical and digital evidence (CCTV surveillance footage, crime scene photographs, witness audio statements, and written logs) and applies computer vision, speech recognition, and grounded AI reasoning to generate structured observations, timestamped chronological events, and downloadable ReportLab forensic PDF dossiers.

---

## 🏛️ System Architecture

```text
                               ┌────────────────────────────────────────────────────────┐
                               │           CrimeVision AI Forensic Web UI               │
                               │      (React 19 + TypeScript + Vite + Tailwind v4)      │
                               └───────────────────────────┬────────────────────────────┘
                                                           │ HTTP REST / JSON
                                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              FastAPI Forensic Backend                                                 │
│                                                                                                                       │
│   ┌────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐   ┌────────────────────────┐   │
│   │ Case Management    │   │ Evidence Integrity Engine │   │ Background Job Queue    │   │ Grounded Forensic Chat │   │
│   │ • Unique Case Refs │   │ • SHA-256 Checksums       │   │ • Keyframe Decoders     │   │ • Groq LLM API         │   │
│   │ • Audit Trails     │   │ • MIME & Header Probes    │   │ • Async Inference Task  │   │ • Strict Citations     │   │
│   └────────────────────┘   └───────────────────────────┘   └─────────────────────────┘   └────────────────────────┘   │
└──────────────────┬───────────────────────────────┬─────────────────────────────┬──────────────────────────────┬───────┘
                   │                               │                             │                              │
                   ▼                               ▼                             ▼                              ▼
      ┌─────────────────────────┐     ┌────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
      │   Vision Pipeline       │     │    Audio Pipeline      │    │   Multimodal Fusion     │    │   Forensic Reporting    │
      │ • RT-DETR Adapter       │     │ • OpenAI Whisper ASR   │    │ • Clock Sync Offsets    │    │ • ReportLab Engine      │
      │ • Bounding Box Norm     │     │ • Segment Timestamps   │    │ • Cross-Corroboration   │    │ • Cryptographic Hashes  │
      │ • CLIP Scene Classifier │     │ • Language Metadata    │    │ • Conflict Resolution   │    │ • Examiner Sign-Off     │
      │ • BLIP Scene Captions   │     │ • Diarization Caveats  │    │ • Unified Event Line    │    │ • PDF Download Dossier  │
      └─────────────────────────┘     └────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

---

## 🚀 Key Features

1. **Forensic Evidence Integrity & Custody**:
   - Computes SHA-256 cryptographic hashes upon ingestion.
   - Preserves raw uploaded files in an isolated evidence locker.
   - Records immutable audit trail events (upload, analysis, report generation).

2. **Multimodal Vision Engine**:
   - **RT-DETR Object Detector Adapter**: Identifies silhouettes, vehicles, carried items, and potential threat candidates with normalized bounding coordinates.
   - **CLIP Zero-Shot Scene Classification**: Classifies scene environments (retail counter, residential room, parking lot, night alley).
   - **BLIP Scene Captioning**: Produces contextual visual descriptions.
   - **Weapon Detection Caveats**: Distinguishes standard detector classes from confirmed firearms/edged weapons, reporting unverified candidates rather than assuming certainty.

3. **Audio Transcription & Timestamping**:
   - **OpenAI Whisper Pipeline**: Multi-lingual speech-to-text with segment start and end timestamps.
   - Preserves original witness utterances while enforcing evidentiary caveats against treating statements as verified facts.

4. **Temporal Video Surveillance Sampling**:
   - OpenCV keyframe extraction at configurable sampling intervals (e.g. 1.5s).
   - Records unanalysed frame gaps transparently.
   - Generates candidate action hypotheses from bounding box centroid trajectories.

5. **Cross-Sensor Multimodal Evidence Fusion**:
   - Aligns asynchronous video, audio, and photographic events into a unified chronological timeline.
   - Cross-corroborates visual cues with auditory utterances.
   - Highlights conflicts and maintains unverified status where independent corroboration is absent.

6. **Grounded AI Forensic Reasoner (Groq & Offline Fallback)**:
   - Evaluates investigator questions against stored case evidence.
   - Mandatory evidence citation (`[EVD-ID]`, timestamps).
   - Explicit uncertainty declaration: outputs *"Not established by the available evidence"* when facts are missing.
   - Strict legal policy: never assigns guilt, provides crime probabilities, or invents facts.

7. **ReportLab Forensic PDF Reports**:
   - Generates downloadable examination dossiers with metadata tables, SHA-256 evidence digests, timeline event tables, and examiner sign-off lines.

8. **Interactive 3D Scene Schematic (Three.js)**:
   - Topological schematic visualization of crime scene objects and detector bounding boxes in 3D coordinate space.

---

## 📂 Project Repository Structure

```text
CrimeVision AI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI application entrypoint & static mounts
│   │   ├── config.py                # Pydantic BaseSettings & environment variables
│   │   ├── database.py              # SQLAlchemy engine & session manager
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py           # SQLAlchemy tables & Pydantic DTO schemas
│   │   ├── api/
│   │   │   ├── __init__.py          # API route aggregator
│   │   │   ├── health.py            # Health & hardware diagnostics endpoints
│   │   │   ├── cases.py             # Investigation case CRUD & dashboard stats
│   │   │   ├── evidence.py          # Evidence upload, SHA-256 hashing, analysis jobs
│   │   │   ├── timeline.py          # Chronologically fused event queries
│   │   │   ├── chat.py              # Grounded Groq reasoning assistant
│   │   │   ├── reports.py           # ReportLab PDF generation and download
│   │   │   └── settings.py          # System settings & demo dossier seed
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── storage.py           # File validation, path sanitization, SHA-256
│   │       ├── image_analysis.py    # RT-DETR adapter, CLIP, BLIP
│   │       ├── audio_analysis.py    # Whisper ASR transcription & timestamps
│   │       ├── video_analysis.py    # OpenCV keyframe sampler & temporal hypotheses
│   │       ├── fusion.py            # Multimodal evidence cross-corroboration
│   │       ├── groq_service.py      # Grounded LLM reasoning & citations
│   │       ├── report_service.py    # ReportLab PDF compiler
│   │       └── background_jobs.py   # Asynchronous inference queue runner
│   ├── tests/
│   │   ├── test_forensic_core.py    # Unit tests for hashing, bounding boxes, fusion
│   │   └── test_api_integration.py  # End-to-end REST lifecycle tests
│   ├── pytest.ini
│   ├── requirements.txt             # Python production dependencies
│   ├── Dockerfile                   # Container build configuration
│   └── render.yaml                  # Render web service deployment blueprint
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx       # Forensic top bar & case selector
│   │   │   │   └── Sidebar.tsx      # Multi-view navigation sidebar
│   │   │   └── ui/
│   │   │       ├── Badge.tsx        # Status & media category tags
│   │   │       ├── Modal.tsx        # Accessible glassmorphic dialog
│   │   │       └── StatCard.tsx     # KPI metrics card with glow borders
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx    # Forensic analytics & case inventory
│   │   │   ├── WorkspacePage.tsx    # Evidence upload, analysis, findings
│   │   │   ├── EvidenceExplorerPage.tsx # Bounding box canvas & frame scrubber
│   │   │   ├── ChatPage.tsx         # AI Investigation Assistant
│   │   │   ├── TimelinePage.tsx     # Synchronized multimodal timeline
│   │   │   ├── Scene3DPage.tsx      # Three.js 3D schematic viewer
│   │   │   ├── ReportsPage.tsx      # PDF dossier compiler & archive
│   │   │   └── SettingsPage.tsx     # System diagnostics & engine configuration
│   │   ├── services/
│   │   │   ├── api.ts               # REST API client
│   │   │   └── types.ts             # TypeScript forensic interfaces
│   │   ├── App.tsx                  # Root state & view switcher
│   │   ├── main.tsx
│   │   └── index.css                # Dark forensic theme & glassmorphism
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vercel.json                  # Vercel SPA deployment configuration
├── .gitignore
├── .env.example                     # Environment template (placeholders only)
└── README.md
```

---

## 🛠️ Local Installation & Quickstart

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- Git

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/crimevision-ai.git
cd crimevision-ai

# Create and activate Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI backend server
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Tests

Run backend unit and integration tests using pytest:
```bash
cd backend
pytest -v
```

**Test Coverage Summary:**
- `test_sanitize_filename`: Path traversal security protection
- `test_sha256_calculation`: Forensic cryptographic hash integrity
- `test_image_analysis_pipeline`: RT-DETR coordinate validation and CLIP scene scoring
- `test_audio_analysis_pipeline`: Whisper transcription segment timestamp validation
- `test_video_analysis_pipeline`: OpenCV temporal keyframe sampling
- `test_multimodal_fusion_corroboration`: Cross-sensor timeline synchronization
- `test_groq_grounding_and_uncertainty`: Grounded citation mandate and absence disclosures
- `test_pdf_report_generation`: ReportLab PDF document compilation
- `test_api_health_and_diagnostics`: Server health check probes
- `test_full_case_evidence_lifecycle`: End-to-end case creation, evidence upload, AI analysis, chat, and report download
- `test_demo_seed_endpoint`: Demonstration dossier initialization

---

## ⚙️ Environment Variables

Create `.env` based on `.env.example`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_ENV` | Environment (`development` or `production`) | `development` |
| `PORT` | API server port | `8000` |
| `CORS_ORIGINS` | Allowed origins for cross-origin requests | `http://localhost:5173` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./data/crimevision.db` |
| `STORAGE_DIR` | Absolute or relative path to evidence locker | `./storage` |
| `MAX_UPLOAD_SIZE_MB` | Maximum file size per uploaded item | `100` |
| `AI_MODE` | AI execution engine (`DEMO`, `LOCAL_AI`, `GROQ`) | `DEMO` |
| `GROQ_API_KEY` | Groq Cloud API key for grounded LLM reasoning | `gsk_...` |
| `GROQ_MODEL` | Groq model identifier | `llama-3.3-70b-versatile` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:8000/api` |

---

## ☁️ Deployment Guide

### Deploy Frontend to Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Framework to `Vite`.
4. Configure Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-url.onrender.com/api`
5. Deploy. The included `vercel.json` ensures client-side routing is preserved.

### Deploy Backend to Render
1. Create a new Web Service on [Render](https://render.com) from the GitHub repository.
2. Select Root Directory as `backend`.
3. Environment: `Python`.
4. Build Command: `pip install --upgrade pip && pip install -r requirements.txt`.
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add Environment Variables:
   - `APP_ENV`: `production`
   - `DEBUG`: `False`
   - `AI_MODE`: `GROQ`
   - `GROQ_API_KEY`: *(Your secure Groq API key)*
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app`
   - `DATABASE_URL`: *(PostgreSQL URL or attach Render Persistent Disk)*
7. Health Check Path: `/api/health`.

---

## ⚖️ Statutory Forensic Limitations & Legal Disclaimer

> [!CAUTION]
> **LEGAL & FORENSIC ADMISSIBILITY NOTICE:**
> 1. **Decision Support Only**: CrimeVision AI is an assistive decision-support platform designed for certified law enforcement analysts. It does **not** replace physical crime scene processing, toolmark analysis, ballistics certification, or expert judicial testimony.
> 2. **No Guilt Determinations**: The system does not classify individuals as criminals, generate probabilities of guilt, or establish intent.
> 3. **Provisional Hypotheses**: All temporal action candidates and scene descriptions generated by AI models are explicitly labeled as **investigative hypotheses**, requiring independent human verification prior to statutory filing.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
