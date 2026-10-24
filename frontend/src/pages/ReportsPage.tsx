import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  Shield,
  Hash,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Case, ReportItem } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface ReportsPageProps {
  activeCase: Case | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ activeCase }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [reportTitle, setReportTitle] = useState('Forensic Multimodal Examination Report');
  const [investigatorName, setInvestigatorName] = useState('Senior Forensic Examiner');
  const [notes, setNotes] = useState('Evidence processed under strict chain of custody protocol.');
  const [includedSections, setIncludedSections] = useState<string[]>([
    'case_metadata',
    'evidence_hashes',
    'detections',
    'timeline',
    'hypotheses',
    'limitations',
    'signoff',
  ]);

  useEffect(() => {
    if (activeCase) {
      loadReports();
    }
  }, [activeCase?.id]);

  const loadReports = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const items = await api.getReports(activeCase.id);
      setReports(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sec: string) => {
    setIncludedSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || generating) return;

    setGenerating(true);
    try {
      await api.generateReport(activeCase.id, {
        title: reportTitle,
        investigator_name: investigatorName,
        notes,
        included_sections: includedSections,
      });
      await loadReports();
    } catch (err: any) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!activeCase) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-charcoal-700/60 max-w-xl mx-auto my-12">
        <FileCheck2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">No Investigation Selected</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select an investigation from the header dropdown to generate or download forensic examination dossiers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              REPORTLAB AUTOMATED DOSSIER GENERATION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Forensic PDF Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Downloadable court-structured examination dossiers containing SHA-256 hashes, observations, and sign-offs.
          </p>
        </div>

        <Badge label="ReportLab Engine" size="md" variant="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Report Builder Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleGenerate}
            className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-700/60">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Generate New Report
              </h2>
              <span className="text-[10px] text-cyan-400 font-mono">CASE: {activeCase.id}</span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                required
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Lead Examiner Name</label>
              <input
                type="text"
                value={investigatorName}
                onChange={(e) => setInvestigatorName(e.target.value)}
                required
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Examiner Field Notes & Caveats</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Checklist of Included Sections */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 font-mono text-[11px]">
                INCLUDED DOSSIER MODULES:
              </label>
              <div className="space-y-1.5 text-xs">
                {[
                  { id: 'case_metadata', label: 'Case Reference & Incident Location' },
                  { id: 'evidence_hashes', label: 'Evidence Inventory & Cryptographic SHA-256 Hashes' },
                  { id: 'detections', label: 'RT-DETR Detections & Confidence Scores' },
                  { id: 'timeline', label: 'Chronologically Fused Multimodal Timeline' },
                  { id: 'hypotheses', label: 'AI Provisional Investigative Hypotheses' },
                  { id: 'limitations', label: 'Model Limitations & Incompleteness Disclaimers' },
                  { id: 'signoff', label: 'Examiner Physical Signature & Seal Lines' },
                ].map((sec) => (
                  <label key={sec.id} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includedSections.includes(sec.id)}
                      onChange={() => toggleSection(sec.id)}
                      className="rounded bg-charcoal-900 border-charcoal-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-[11px]">{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF Document...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Build & Compile PDF Dossier</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Reports Archive (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-charcoal-700/60">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Generated Dossiers Archive
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">{reports.length} DOSSIERS</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading report archive...</div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No reports compiled yet for this investigation. Use the form on the left to generate one.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rpt) => (
                  <div
                    key={rpt.id}
                    className="p-4 rounded-xl bg-charcoal-850/80 border border-charcoal-700/70 hover:border-cyan-500/40 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-cyan-400 font-bold">{rpt.id}</span>
                          <Badge label={rpt.status} size="sm" variant="emerald" />
                        </div>
                        <h3 className="text-sm font-semibold text-white mt-1">{rpt.title}</h3>
                        <p className="text-[11px] text-slate-400">
                          Examiner: {rpt.investigator_name} | Created:{' '}
                          {new Date(rpt.created_at).toLocaleString()}
                        </p>
                      </div>

                      <a
                        href={api.getReportDownloadUrl(rpt.id)}
                        download={`${rpt.id}.pdf`}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center space-x-1.5 transition-all shadow-glow-cyan shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>

                    <div className="p-2.5 rounded-lg bg-charcoal-900 border border-charcoal-800 text-[10px] font-mono text-slate-400 space-y-0.5">
                      <div className="text-slate-500">PDF Cryptographic SHA-256 Digest:</div>
                      <div className="text-cyan-300 break-all">{rpt.sha256_hash}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
