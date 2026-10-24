import React, { useState } from 'react';
import { Shield, Sparkles, FolderPlus, Database, Activity, RefreshCw } from 'lucide-react';
import { Case } from '../../services/types';

interface NavbarProps {
  cases: Case[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  onOpenNewCaseModal: () => void;
  onSeedDemo: () => void;
  aiMode: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onOpenNewCaseModal,
  onSeedDemo,
  aiMode,
}) => {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedDemo();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="h-16 border-b border-charcoal-700/60 bg-charcoal-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Platform Identity */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-cyan-400/20 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan">
          <Shield className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-wider text-white">CRIMEVISION</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              AI FORENSICS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-tight">Multimodal Intelligence & Chain-of-Custody Analytics</p>
        </div>
      </div>

      {/* Case Selector & Global Actions */}
      <div className="flex items-center space-x-4">
        {/* Active Case Selector */}
        <div className="flex items-center space-x-2 bg-charcoal-850 border border-charcoal-700/80 rounded-lg px-3 py-1.5 shadow-inner">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Case:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => onSelectCase(e.target.value)}
            className="bg-transparent text-xs font-medium text-cyan-300 focus:outline-none cursor-pointer max-w-[240px] truncate"
          >
            {cases.length === 0 ? (
              <option value="" className="bg-charcoal-900 text-slate-400">
                No active investigations
              </option>
            ) : (
              cases.map((c) => (
                <option key={c.id} value={c.id} className="bg-charcoal-900 text-slate-200">
                  {c.id} — {c.title.slice(0, 32)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Demo Seed Button */}
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-600/40 hover:bg-amber-900/50 hover:border-amber-500/60 rounded-lg transition-all shadow-glow-amber disabled:opacity-50"
          title="Seed realistic multi-sensor robbery/burglary demonstration dossier"
        >
          <Sparkles className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Loading Dossier...' : 'Seed Demo Case'}</span>
        </button>

        {/* New Case Button */}
        <button
          onClick={onOpenNewCaseModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 rounded-lg shadow-glow-cyan transition-all"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Investigation</span>
        </button>

        {/* Engine Status Badge */}
        <div className="flex items-center space-x-1.5 bg-charcoal-800/80 border border-charcoal-700/60 px-2.5 py-1.5 rounded-lg text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">ENGINE:</span>
          <span className="text-emerald-400 font-semibold uppercase">{aiMode}</span>
        </div>
      </div>
    </header>
  );
};
