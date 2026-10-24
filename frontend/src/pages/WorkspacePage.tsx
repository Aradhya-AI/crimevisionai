import React, { useState, useEffect } from 'react';
import {
  Upload,
  Play,
  FileCheck,
  Clock,
  Sparkles,
  Shield,
  FileText,
  AlertTriangle,
  RefreshCw,
  Hash,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Case, EvidenceItem, AnalysisResult } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface WorkspacePageProps {
  activeCase: Case | null;
  onRefreshCase: () => void;
  onOpenExplorer: (evidenceId: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  activeCase,
  onRefreshCase,
  onOpenExplorer,
}) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (activeCase) {
      loadEvidence();
    }
  }, [activeCase?.id]);

  const loadEvidence = async () => {
    if (!activeCase) return;
    try {
      const items = await api.getCaseEvidence(activeCase.id);
      setEvidenceList(items);
      if (items.length > 0 && !selectedEvidence) {
        handleSelectEvidence(items[0]);
      }
    } catch (err) {
      console.error('Failed to load case evidence:', err);
    }
  };

  const handleSelectEvidence = async (item: EvidenceItem) => {
    setSelectedEvidence(item);
    setAnalysisResult(null);
    setLoadingAnalysis(true);
    try {
      const anl = await api.getEvidenceAnalysis(item.id);
      setAnalysisResult(anl);
    } catch (err) {
      // Analysis might not have run yet
      setAnalysisResult(null);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCase) return;

    setUploading(true);
    try {
      const newEv = await api.uploadEvidence(activeCase.id, file);
      await loadEvidence();
      handleSelectEvidence(newEv);
      onRefreshCase();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRunAnalysis = async (item: EvidenceItem) => {
    setAnalyzingId(item.id);
    setAnalysisProgress(10);
    setStatusMessage('Submitting to multimodal inference queue...');

    try {
      const job = await api.triggerAnalysis(item.id);
      
      // Poll job status until complete
      const interval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(job.id);
          setAnalysisProgress(status.progress_pct);
          setStatusMessage(status.message);

          if (status.status === 'COMPLETED') {
            clearInterval(interval);
            setAnalyzingId(null);
            await loadEvidence();
            handleSelectEvidence(item);
            onRefreshCase();
          } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
            clearInterval(interval);
            setAnalyzingId(null);
            alert(`Analysis ${status.status.toLowerCase()}: ${status.error_detail || status.message}`);
            await loadEvidence();
          }
        } catch (e) {
          clearInterval(interval);
          setAnalyzingId(null);
        }
      }, 1000);

    } catch (err: any) {
      alert(`Analysis trigger failed: ${err.message}`);
      setAnalyzingId(null);
    }
  };

  if (!activeCase) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-charcoal-700/60 max-w-xl mx-auto my-12">
        <Shield className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Investigation Selected</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Please select an active case from the header dropdown or create a new investigation dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Case Header Details Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="font-mono text-xs text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
                {activeCase.id}
              </span>
              <Badge
                label={activeCase.status}
                size="sm"
                variant={activeCase.status === 'OPEN' ? 'emerald' : 'amber'}
              />
              <span className="text-xs text-slate-400 font-mono">
                {activeCase.incident_date || 'Date Unspecified'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{activeCase.title}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {activeCase.description || 'No case synopsis recorded.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Upload Evidence Input */}
            <label className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-glow-cyan transition-all cursor-pointer flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Ingesting Evidence...' : 'Ingest Evidence File'}</span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.txt,.json"
              />
            </label>
          </div>
        </div>

        {/* Lead Examiner & Location Meta */}
        <div className="mt-4 pt-3 border-t border-charcoal-700/60 flex flex-wrap gap-6 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Location: </span>
            <span className="text-slate-200">{activeCase.location || 'Central Precinct'}</span>
          </div>
          <div>
            <span className="text-slate-500">Lead Examiner: </span>
            <span className="text-slate-200">{activeCase.lead_investigator || 'Forensic Agent'}</span>
          </div>
          <div>
            <span className="text-slate-500">Evidence Count: </span>
            <span className="text-cyan-400 font-mono font-bold">{evidenceList.length} files</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Evidence Locker Inventory (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Evidence Locker
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {evidenceList.length} ITEMS
              </span>
            </div>

            {evidenceList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No evidence items uploaded yet. Ingest an image, video, or audio file to begin.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {evidenceList.map((item) => {
                  const isSelected = selectedEvidence?.id === item.id;
                  const isAnalyzing = analyzingId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEvidence(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-charcoal-800/90 border-cyan-500/50 shadow-glow-cyan'
                          : 'bg-charcoal-850/60 border-charcoal-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                              {item.id}
                            </span>
                            <Badge label={item.media_type.toUpperCase()} size="sm" variant="cyan" />
                          </div>
                          <p className="text-xs font-medium text-white truncate">
                            {item.original_name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                            SHA: {item.sha256_hash.slice(0, 16)}...
                          </p>
                        </div>

                        <div className="ml-2 flex flex-col items-end">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              item.analysis_status === 'COMPLETED'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                : item.analysis_status === 'PROCESSING'
                                ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30 animate-pulse'
                                : 'bg-charcoal-700 text-slate-400'
                            }`}
                          >
                            {item.analysis_status}
                          </span>
                        </div>
                      </div>

                      {/* Trigger Button if Pending */}
                      {item.analysis_status === 'PENDING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunAnalysis(item);
                          }}
                          disabled={isAnalyzing}
                          className="mt-2 w-full py-1 text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run Multimodal Analysis</span>
                        </button>
                      )}

                      {/* Progress indicator when active */}
                      {isAnalyzing && (
                        <div className="mt-2 space-y-1">
                          <div className="w-full bg-charcoal-900 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-400 h-full transition-all duration-300"
                              style={{ width: `${analysisProgress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-cyan-300 font-mono truncate">{statusMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chain-of-Custody Cryptographic Hash Audit Box */}
          {selectedEvidence && (
            <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-300 font-bold font-mono text-[11px]">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                <span>EVIDENCE INTEGRITY AUDIT</span>
              </div>
              <div className="bg-charcoal-950 p-2.5 rounded-lg border border-charcoal-800 space-y-1 font-mono text-[10px]">
                <div className="text-slate-500">SHA-256 Digest:</div>
                <div className="text-cyan-400 break-all">{selectedEvidence.sha256_hash}</div>
                <div className="text-slate-500 mt-2">File Size: {roundBytes(selectedEvidence.file_size_bytes)}</div>
                <div className="text-slate-500">MIME Type: {selectedEvidence.mime_type}</div>
              </div>
              <div className="pt-2">
                <a
                  href={api.getEvidenceDownloadUrl(selectedEvidence.id)}
                  download={selectedEvidence.original_name}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-300 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Original Evidence</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Evidence Inspector & Multimodal Findings (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedEvidence ? (
            <div className="glass-panel p-16 rounded-2xl border border-charcoal-700/60 text-center text-slate-500">
              Select an evidence file on the left to inspect forensic detections.
            </div>
          ) : (
            <>
              {/* Evidence Inspector Toolbar */}
              <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-charcoal-700/60">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-white">{selectedEvidence.original_name}</h2>
                      <Badge label={selectedEvidence.media_type.toUpperCase()} size="sm" variant="cyan" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ingested: {new Date(selectedEvidence.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRunAnalysis(selectedEvidence)}
                      disabled={analyzingId === selectedEvidence.id}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 rounded-lg flex items-center space-x-1.5 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${analyzingId === selectedEvidence.id ? 'animate-spin' : ''}`} />
                      <span>{analyzingId === selectedEvidence.id ? 'Analyzing...' : 'Re-run Analysis'}</span>
                    </button>
                    <button
                      onClick={() => onOpenExplorer(selectedEvidence.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
                    >
                      Open in Evidence Explorer →
                    </button>
                  </div>
                </div>

                {/* Analysis Detections & Scene Output */}
                {loadingAnalysis ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading forensic analysis results...</span>
                  </div>
                ) : !analysisResult ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                    <p>No model analysis has been generated for this file yet.</p>
                    <button
                      onClick={() => handleRunAnalysis(selectedEvidence)}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-glow-cyan"
                    >
                      Trigger Inference Engine
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Scene Caption */}
                    {analysisResult.caption && (
                      <div className="p-3.5 rounded-xl bg-charcoal-850 border border-charcoal-700/60 text-xs text-slate-200">
                        <span className="font-mono text-cyan-400 font-bold text-[11px] block mb-1">
                          BLIP SCENE CAPTION:
                        </span>
                        <p className="italic text-slate-300">"{analysisResult.caption}"</p>
                      </div>
                    )}

                    {/* Detections Pill List */}
                    {analysisResult.detections && analysisResult.detections.length > 0 && (
                      <div>
                        <span className="font-mono text-slate-400 text-[10px] tracking-wider uppercase block mb-2">
                          RT-DETR OBJECT DETECTIONS & CONFIDENCE SCORES
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {analysisResult.detections.slice(0, 9).map((det, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-charcoal-850/80 border border-charcoal-700/70 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-white capitalize">{det.label}</span>
                                {det.timestamp !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    @{det.timestamp}s
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] font-bold text-cyan-400">
                                {Math.round(det.confidence * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Transcript Preview */}
                    {analysisResult.transcript?.segments && analysisResult.transcript.segments.length > 0 && (
                      <div className="p-4 rounded-xl bg-charcoal-850 border border-charcoal-700/60 space-y-2">
                        <div className="flex items-center justify-between font-mono text-[11px] text-amber-400 font-bold">
                          <span>WHISPER SPEECH TRANSCRIPTION</span>
                          <span className="text-slate-400 text-[10px]">
                            LANG: {analysisResult.transcript.language?.toUpperCase() || 'EN'}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {analysisResult.transcript.segments.map((seg, idx) => (
                            <div key={idx} className="text-xs flex items-start space-x-2">
                              <span className="font-mono text-slate-500 text-[10px] shrink-0 pt-0.5">
                                [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                              </span>
                              <p className="text-slate-200">"{seg.text}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Forensic Direct Observations */}
                    {analysisResult.observations && analysisResult.observations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-mono text-slate-400 text-[10px] tracking-wider uppercase block">
                          DIRECT FORENSIC OBSERVATIONS
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {analysisResult.observations.map((obs, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-cyan-400 font-bold">•</span>
                              <span>{obs}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Clearly Labeled Hypotheses (Section 6 Compliance) */}
                    {analysisResult.hypotheses && analysisResult.hypotheses.length > 0 && (
                      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/30 space-y-2">
                        <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>AI INVESTIGATIVE HYPOTHESES (PROVISIONAL — NOT CERTIFIED FACTS)</span>
                        </div>
                        <div className="space-y-2">
                          {analysisResult.hypotheses.map((hyp, idx) => (
                            <div key={idx} className="text-xs text-slate-200 pl-3 border-l-2 border-amber-500/50">
                              <p className="font-medium text-amber-200">
                                {hyp.scenario || hyp.action_candidate}
                              </p>
                              {hyp.supporting_evidence && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Supporting: {hyp.supporting_evidence.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mandatory Limitations & Gaps Disclosure */}
                    {analysisResult.limitations && analysisResult.limitations.length > 0 && (
                      <div className="p-3 rounded-lg bg-charcoal-900 border border-charcoal-700/60 text-[11px] text-slate-400 space-y-1">
                        <span className="font-mono text-slate-500 text-[10px] uppercase block">
                          MODEL LIMITATIONS & UNANALYSED GAPS:
                        </span>
                        {analysisResult.limitations.map((lim, idx) => (
                          <p key={idx}>• {lim}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function roundBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
