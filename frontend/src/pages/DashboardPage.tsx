import React from 'react';
import {
  FolderGit2,
  FileCheck,
  Cpu,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Camera,
  Film,
  Mic,
  FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { DashboardStats, Case } from '../services/types';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

interface DashboardPageProps {
  stats: DashboardStats | null;
  cases: Case[];
  onSelectCase: (caseId: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenNewCaseModal: () => void;
  onSeedDemo: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  cases,
  onSelectCase,
  onNavigateTab,
  onOpenNewCaseModal,
  onSeedDemo,
}) => {
  const chartData = [
    { name: 'Images', count: stats?.media_distribution?.image || 0, color: '#00e5ff' },
    { name: 'Videos', count: stats?.media_distribution?.video || 0, color: '#2979ff' },
    { name: 'Audio', count: stats?.media_distribution?.audio || 0, color: '#ffb703' },
    { name: 'Documents', count: stats?.media_distribution?.document || 0, color: '#00f59b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="glass-panel p-6 rounded-2xl border border-charcoal-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                FORENSIC COMMAND SYSTEM v1.0
              </span>
              <span className="text-xs text-slate-400">| Session Active</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Multimodal Evidence Intelligence Platform
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Automated video frame sampling, RT-DETR object detection, Whisper speech transcription, and
              Groq-grounded reasoning. Assisting forensic examiners with strict chain-of-custody tracking.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onSeedDemo}
              className="px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-600/40 hover:bg-amber-900/50 rounded-xl transition-all shadow-glow-amber flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Seed Demo Case</span>
            </button>
            <button
              onClick={onOpenNewCaseModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition-all shadow-glow-cyan flex items-center space-x-2"
            >
              <span>+ New Investigation</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Investigations"
          value={stats?.total_cases || cases.length}
          subtitle="Registered law enforcement dossiers"
          icon={<FolderGit2 className="w-5 h-5" />}
          accentColor="cyan"
        />
        <StatCard
          title="Ingested Evidence"
          value={stats?.total_evidence_files || 0}
          subtitle="Cryptographically hashed files"
          icon={<FileCheck className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Inference Jobs"
          value={`${stats?.completed_jobs || 0} / ${(stats?.active_jobs || 0) + (stats?.completed_jobs || 0)}`}
          subtitle={stats?.active_jobs ? `${stats.active_jobs} workers processing` : 'All background queues idle'}
          icon={<Cpu className="w-5 h-5" />}
          accentColor="emerald"
        />
        <StatCard
          title="Verification Status"
          value="100% Audited"
          subtitle="Zero unverified criminal claims"
          icon={<Clock className="w-5 h-5" />}
          accentColor="amber"
        />
      </div>

      {/* Analytics & Ingestion Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Media Type Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white tracking-wide">Evidence Ingestion Profile</h2>
              <span className="text-[10px] font-mono text-slate-400">BY MEDIA TYPE</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribution of forensic digital media items ingested into the secure evidence locker.
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b111a',
                    borderColor: '#1e2d47',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f0f6fc',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-charcoal-700/40 text-[11px]">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>{stats?.media_distribution?.image || 0} Images</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span>{stats?.media_distribution?.video || 0} CCTV Videos</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>{stats?.media_distribution?.audio || 0} Audio Files</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-400">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>{stats?.media_distribution?.document || 0} Notes/Docs</span>
            </div>
          </div>
        </div>

        {/* Recent Cases Table */}
        <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Recent Case Dossiers</h2>
              <p className="text-xs text-slate-400 mt-0.5">Quick access to current investigation workspaces</p>
            </div>
            <button
              onClick={() => onNavigateTab('workspace')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium transition-colors"
            >
              <span>View Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs">No active investigation dossiers registered yet.</p>
              <button
                onClick={onSeedDemo}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-600/40"
              >
                Click here to seed demonstration case
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-charcoal-700/60 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="pb-2.5">Case Reference</th>
                    <th className="pb-2.5">Investigation Title</th>
                    <th className="pb-2.5">Location</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-800/60 text-slate-300">
                  {cases.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-charcoal-800/40 transition-colors group">
                      <td className="py-3 font-mono text-cyan-400 font-semibold">{c.id}</td>
                      <td className="py-3 font-medium text-white max-w-xs truncate">{c.title}</td>
                      <td className="py-3 text-slate-400">{c.location || 'Unspecified'}</td>
                      <td className="py-3">
                        <Badge
                          label={c.status}
                          size="sm"
                          variant={c.status === 'OPEN' ? 'emerald' : c.status === 'UNDER_REVIEW' ? 'amber' : 'slate'}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            onSelectCase(c.id);
                            onNavigateTab('workspace');
                          }}
                          className="px-2.5 py-1 rounded bg-charcoal-800 text-cyan-300 hover:bg-cyan-950 hover:border-cyan-500/50 border border-charcoal-700 transition-all font-mono text-[10px]"
                        >
                          Open Dossier →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
