import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: 'cyan' | 'blue' | 'amber' | 'emerald' | 'crimson';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor = 'cyan',
}) => {
  const accentBorder = {
    cyan: 'hover:border-cyan-500/40 border-charcoal-700/60 shadow-glow-cyan',
    blue: 'hover:border-blue-500/40 border-charcoal-700/60',
    amber: 'hover:border-amber-500/40 border-charcoal-700/60 shadow-glow-amber',
    emerald: 'hover:border-emerald-500/40 border-charcoal-700/60',
    crimson: 'hover:border-rose-500/40 border-charcoal-700/60 shadow-glow-crimson',
  }[accentColor];

  const iconColor = {
    cyan: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    blue: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
    amber: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    crimson: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
  }[accentColor];

  return (
    <div
      className={`glass-panel p-5 rounded-xl border transition-all duration-300 relative overflow-hidden group ${accentBorder}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
          {title}
        </span>
        <div className={`p-2 rounded-lg border ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-white tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-1 font-sans">{subtitle}</p>
      )}
    </div>
  );
};
