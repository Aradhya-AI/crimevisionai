import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  ScanEye,
  BotMessageSquare,
  Clock,
  Box,
  FileCheck2,
  Cpu
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'workspace'
  | 'explorer'
  | 'chat'
  | 'timeline'
  | 'scene3d'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeCaseId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, activeCaseId }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'workspace', label: 'Case Workspace', icon: <FolderGit2 className="w-4 h-4" /> },
    { id: 'explorer', label: 'Evidence Explorer', icon: <ScanEye className="w-4 h-4" />, badge: 'RT-DETR' },
    { id: 'chat', label: 'Forensic Assistant', icon: <BotMessageSquare className="w-4 h-4" />, badge: 'Groq' },
    { id: 'timeline', label: 'Unified Timeline', icon: <Clock className="w-4 h-4" />, badge: 'Fused' },
    { id: 'scene3d', label: '3D Schematic', icon: <Box className="w-4 h-4" />, badge: 'Three.js' },
    { id: 'reports', label: 'Forensic PDF Reports', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Diagnostics & System', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-charcoal-700/60 bg-charcoal-900/95 flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation Category */}
        <div>
          <div className="text-[11px] font-mono tracking-wider uppercase text-slate-500 px-3 mb-2">
            Forensic Intelligence
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-charcoal-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                          : 'bg-charcoal-800 text-slate-500 border border-charcoal-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Forensic Custody Notice */}
      <div className="p-3 rounded-lg bg-charcoal-850/80 border border-charcoal-700/60 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between font-mono text-[9px] text-slate-500">
          <span>CHAIN-OF-CUSTODY</span>
          <span className="text-emerald-400">ENFORCED</span>
        </div>
        <p className="text-slate-400 text-[10px] leading-tight">
          SHA-256 hashed evidence storage. All hypotheses require human validation before statutory filing.
        </p>
      </div>
    </aside>
  );
};
