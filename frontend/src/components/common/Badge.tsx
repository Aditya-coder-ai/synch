import React from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'cool' | 'ok' | 'bad' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-[var(--color-paper-3)] text-[var(--color-ink-2)] border-[var(--color-rule)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]',
    cool: 'bg-[var(--color-cool-soft)] text-[var(--color-cool)] border-[var(--color-cool)]',
    ok: 'bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]',
    bad: 'bg-[var(--color-bad-soft)] text-[var(--color-bad)] border-[var(--color-bad)]',
    warning: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono rounded-[var(--radius-pill)] border ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

