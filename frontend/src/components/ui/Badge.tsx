import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'cyan' | 'blue' | 'amber' | 'emerald' | 'crimson' | 'slate';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'cyan',
  size = 'md',
  icon,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    blue: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    crimson: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    slate: 'bg-charcoal-800 text-slate-300 border-charcoal-700',
  }[variant];

  const sizeStyles = {
    sm: 'text-[9px] px-1.5 py-0.5 font-mono',
    md: 'text-xs px-2.5 py-1 font-mono',
  }[size];

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-md border font-medium ${sizeStyles} ${variantStyles}`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
