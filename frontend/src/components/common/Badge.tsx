import React from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'cool' | 'ok' | 'bad' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-[#141c32]/80 text-[var(--color-ink-2)] border-white/10',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/30 shadow-[0_0_10px_rgba(0,242,254,0.15)]',
    cool: 'bg-[var(--color-cool-soft)] text-[#c084fc] border-[#a855f7]/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
    ok: 'bg-[var(--color-ok-soft)] text-[#34d399] border-[#10b981]/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    bad: 'bg-[var(--color-bad-soft)] text-[#fb7185] border-[#f43f5e]/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    warning: 'bg-[var(--color-warn-soft)] text-[#fbbf24] border-[#f59e0b]/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full border transition-all duration-200 ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
