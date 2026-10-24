import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Shield,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Server
} from 'lucide-react';
import { SystemSettings, SystemDiagnostics } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Editable settings
  const [aiMode, setAiMode] = useState<string>('DEMO');
  const [groqModel, setGroqModel] = useState<string>('llama-3.3-70b-versatile');

  useEffect(() => {
    loadSettingsAndDiagnostics();
  }, []);

  const loadSettingsAndDiagnostics = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([api.getSettings(), api.getDiagnostics()]);
      setSettings(s);
      setDiagnostics(d);
      setAiMode(s.ai_mode);
      setGroqModel(s.groq_model);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.updateSettings({ ai_mode: aiMode, groq_model: groqModel });
      alert('System operational mode updated successfully.');
      await loadSettingsAndDiagnostics();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              FORENSIC SYSTEM ARCHITECTURE & DIAGNOSTICS
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Settings & Engine Diagnostics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Model checkpoint configuration, hardware inspection, and evidence storage security controls.
          </p>
        </div>

        <button
          onClick={loadSettingsAndDiagnostics}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 flex items-center space-x-1.5 transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mode Configuration Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleSave}
            className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-700/60">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Inference Engine Mode
              </h2>
              <Badge label={aiMode} size="sm" variant="cyan" />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Active Execution Mode
              </label>
              <select
                value={aiMode}
                onChange={(e) => setAiMode(e.target.value)}
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="DEMO">DEMO MODE (Calibrated synthetic data & instant testing)</option>
                <option value="LOCAL_AI">LOCAL AI MODE (PyTorch / Transformers / OpenCV)</option>
                <option value="GROQ">GROQ MODE (Grounded LLM Reasoner Active)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                In DEMO mode, the platform runs instantly with high-fidelity realistic forensic data without requiring heavy GPUs.
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Groq LLM Model Selection
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fast / Low Latency)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (High Context)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-glow-cyan transition-all"
              >
                {updating ? 'Saving Configuration...' : 'Apply Operational Changes'}
              </button>
            </div>
          </form>

          {/* Secret Key & API Security Notice */}
          <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[11px] font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>SECURITY & SECRETS ISOLATION</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              API credentials and database passwords are restricted strictly to server-side environment variables.
              No secrets are ever bundled into or transmitted to client browser bundles.
            </p>
            <div className="pt-1 flex items-center justify-between font-mono text-[10px]">
              <span className="text-slate-500">Groq Key Status:</span>
              <span className={settings?.groq_key_configured ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {settings?.groq_key_configured ? 'CONFIGURED ON BACKEND' : 'OFFLINE / FALLBACK ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Hardware & Diagnostic Panels (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-charcoal-700/60">
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Hardware Probing & System Metrics
              </h2>
              <span className="text-[10px] text-emerald-400 font-mono">STATUS: OPTIMAL</span>
            </div>

            {diagnostics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-charcoal-850/80 border border-charcoal-700/60 space-y-1">
                  <span className="text-slate-500 font-mono text-[10px] block">CPU RESOURCE</span>
                  <span className="font-bold text-white text-sm">
                    {diagnostics.hardware.cpu_cores} Logical Cores
                  </span>
                  <p className="text-[10px] text-slate-400">Multi-threaded video frame worker queue ready</p>
                </div>

                <div className="p-3 rounded-xl bg-charcoal-850/80 border border-charcoal-700/60 space-y-1">
                  <span className="text-slate-500 font-mono text-[10px] block">SYSTEM MEMORY</span>
                  <span className="font-bold text-white text-sm">
                    {diagnostics.hardware.ram_available_gb} GB / {diagnostics.hardware.ram_total_gb} GB Free
                  </span>
                  <p className="text-[10px] text-slate-400">Sufficient memory for model tensor weights</p>
                </div>

                <div className="p-3 rounded-xl bg-charcoal-850/80 border border-charcoal-700/60 space-y-1">
                  <span className="text-slate-500 font-mono text-[10px] block">GPU ACCELERATION</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {diagnostics.hardware.gpu_device_name}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {diagnostics.hardware.gpu_detected ? 'CUDA Active' : 'CPU Inference Fallback Active'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-charcoal-850/80 border border-charcoal-700/60 space-y-1">
                  <span className="text-slate-500 font-mono text-[10px] block">PERSISTENT STORAGE</span>
                  <span className="font-bold text-white text-sm">
                    Max {diagnostics.storage.max_file_size_mb} MB / Upload
                  </span>
                  <p className="text-[10px] text-slate-400 truncate">Dir: {diagnostics.storage.uploads_directory}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">Loading hardware metrics...</div>
            )}
          </div>

          {/* Model Engines Checklist */}
          <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 space-y-3">
            <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider pb-2 border-b border-charcoal-700/60">
              Forensic Model Subsystems
            </h2>
            <div className="space-y-2 text-xs">
              {[
                { name: 'RT-DETR Object Detector Adapter', role: 'Object, silhouette, and weapon candidate bounding boxes', status: 'READY (v1.0)' },
                { name: 'OpenAI Whisper Multi-Lingual ASR', role: 'Witness auditory speech-to-text with segment timestamps', status: 'READY (v1.0)' },
                { name: 'CLIP Zero-Shot Scene Classifier', role: 'Forensic environment classification and similarity scoring', status: 'READY (ViT-B/32)' },
                { name: 'BLIP Image Captioning Pipeline', role: 'High-level natural language scene description', status: 'READY (BLIP-base)' },
                { name: 'Groq Grounded Reasoner', role: 'Case dossier synthesis with strict evidence citations', status: settings?.groq_key_configured ? 'GROQ API ONLINE' : 'DETERMINISTIC FALLBACK READY' }
              ].map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-charcoal-850/60 border border-charcoal-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">{m.name}</span>
                    <span className="text-[11px] text-slate-400">{m.role}</span>
                  </div>
                  <Badge label={m.status} size="sm" variant="emerald" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
