export interface Case {
  id: string;
  title: string;
  description: string;
  incident_date: string;
  location: string;
  lead_investigator: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
  audit_trail: Array<{
    timestamp: string;
    action: string;
    actor?: string;
    detail?: string;
    [key: string]: any;
  }>;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  filename: string;
  original_name: string;
  media_type: 'image' | 'video' | 'audio' | 'document' | 'binary';
  file_size_bytes: number;
  sha256_hash: string;
  mime_type: string;
  metadata_info: Record<string, any>;
  analysis_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface DetectionItem {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  track_id?: string | number;
  timestamp?: number;
  frame_number?: number;
  is_weapon_candidate?: boolean;
  notes?: string;
}

export interface SceneLabel {
  label: string;
  similarity_score: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
  confidence?: number;
}

export interface AnalysisResult {
  id: string;
  evidence_id: string;
  case_id: string;
  media_type: string;
  detections: DetectionItem[];
  scene_labels: SceneLabel[];
  caption: string;
  transcript: {
    language?: string;
    segments?: TranscriptSegment[];
    [key: string]: any;
  };
  observations: string[];
  hypotheses: Array<{
    hypothesis_id?: string;
    scenario?: string;
    action_candidate?: string;
    confidence_score?: number;
    supporting_evidence?: string[];
    contradicting_evidence?: string[];
    [key: string]: any;
  }>;
  limitations: string[];
  model_metadata: Record<string, any>;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  timestamp_start: number;
  timestamp_end: number;
  event_type: 'object_detection' | 'speech_utterance' | 'temporal_action' | 'static_scene_element' | string;
  description: string;
  source_evidence_ids: string[];
  supporting_observations: string[];
  contradicting_observations: string[];
  confidence: number | null;
  verification_status: 'unverified' | 'corroborated' | 'conflicting';
  model_metadata: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  case_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Array<{
    evidence_id?: string;
    filename?: string;
    media_type?: string;
    timestamp?: number;
    [key: string]: any;
  }>;
  created_at: string;
}

export interface ReportItem {
  id: string;
  case_id: string;
  title: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  file_size_bytes: number;
  sha256_hash: string;
  investigator_name: string;
  created_at: string;
}

export interface DashboardStats {
  total_cases: number;
  total_evidence_files: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  media_distribution: {
    image: number;
    video: number;
    audio: number;
    document: number;
  };
  recent_cases: Case[];
}

export interface SystemDiagnostics {
  hardware: {
    cpu_cores: number;
    ram_total_gb: number;
    ram_available_gb: number;
    gpu_detected: boolean;
    gpu_device_name: string;
  };
  model_engines: Record<string, { status: string; [key: string]: any }>;
  storage: {
    uploads_directory: string;
    reports_directory: string;
    max_file_size_mb: number;
  };
}

export interface SystemSettings {
  app_name: string;
  app_env: string;
  api_prefix: string;
  ai_mode: string;
  groq_model: string;
  groq_key_configured: boolean;
  device: string;
  max_upload_size_mb: number;
  storage_dir: string;
  database_type: string;
}
