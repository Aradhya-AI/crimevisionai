import {
  Case, EvidenceItem, AnalysisResult, TimelineEvent,
  ChatMessage, ReportItem, DashboardStats, SystemDiagnostics, SystemSettings
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errDetail = 'Request failed';
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errJson.message || `HTTP ${res.status}`;
      } catch {
        errDetail = `HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errDetail);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`API Error on [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Health & System
  getHealth: () => request<any>('/health'),
  getDiagnostics: () => request<SystemDiagnostics>('/diagnostics'),
  getSettings: () => request<SystemSettings>('/settings'),
  updateSettings: (payload: Partial<SystemSettings>) =>
    request<any>('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Dashboard & Cases
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getCases: () => request<Case[]>('/cases'),
  getCase: (caseId: string) => request<Case>(`/cases/${caseId}`),
  createCase: (payload: { title: string; description?: string; incident_date?: string; location?: string; lead_investigator?: string }) =>
    request<Case>('/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteCase: (caseId: string) =>
    fetch(`${API_BASE}/cases/${caseId}`, { method: 'DELETE' }),

  // Evidence
  getCaseEvidence: (caseId: string) => request<EvidenceItem[]>(`/cases/${caseId}/evidence`),
  getEvidence: (evidenceId: string) => request<EvidenceItem>(`/evidence/${evidenceId}`),
  getEvidenceAnalysis: (evidenceId: string) => request<AnalysisResult>(`/evidence/${evidenceId}/analysis`),
  uploadEvidence: async (caseId: string, file: File): Promise<EvidenceItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  triggerAnalysis: (evidenceId: string) =>
    request<{ id: string; status: string; progress_pct: number }>(`/evidence/${evidenceId}/analyze`, {
      method: 'POST',
    }),
  getJobStatus: (jobId: string) =>
    request<{ id: string; status: string; progress_pct: number; message: string; error_detail?: string }>(`/jobs/${jobId}`),

  getEvidenceDownloadUrl: (evidenceId: string) => `${API_BASE}/evidence/${evidenceId}/download`,

  // Timeline
  getTimeline: (caseId: string, filters?: { event_type?: string; verification_status?: string; min_confidence?: number }) => {
    const params = new URLSearchParams();
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.verification_status) params.append('verification_status', filters.verification_status);
    if (filters?.min_confidence !== undefined) params.append('min_confidence', filters.min_confidence.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<TimelineEvent[]>(`/cases/${caseId}/timeline${query}`);
  },

  // AI Assistant Chat
  sendChatMessage: (caseId: string, question: string, conversationId?: string) =>
    request<ChatMessage>(`/cases/${caseId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, conversation_id: conversationId }),
    }),
  getChatHistory: (caseId: string, conversationId?: string) => {
    const query = conversationId ? `?conversation_id=${conversationId}` : '';
    return request<ChatMessage[]>(`/cases/${caseId}/conversations${query}`);
  },

  // Reports
  generateReport: (caseId: string, payload: { title?: string; investigator_name?: string; notes?: string; included_sections?: string[] }) =>
    request<ReportItem>(`/cases/${caseId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getReports: (caseId: string) => request<ReportItem[]>(`/cases/${caseId}/reports`),
  getReportDownloadUrl: (reportId: string) => `${API_BASE}/reports/${reportId}/download`,

  // Demo Seeding
  seedDemo: () => request<{ status: string; case_id: string; title: string }>('/demo/seed', { method: 'POST' }),
};
