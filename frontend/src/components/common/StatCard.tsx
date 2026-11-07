import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'accent' | 'cool' | 'ok' | 'bad';
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'default',
  onClick,
}: StatCardProps) {
  const toneValueClasses = {
    default: 'text-[var(--color-ink)]',
    accent: 'text-[var(--color-accent)]',
    cool: 'text-[var(--color-cool)]',
    ok: 'text-[var(--color-ok)]',
    bad: 'text-[var(--color-bad)]',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col justify-between p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] text-left w-full transition-colors ${
        onClick ? 'hover:border-[var(--color-rule-2)] cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-[var(--color-muted)] font-normal">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[var(--color-muted)] shrink-0" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-mono font-medium ${toneValueClasses[tone]}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-[var(--color-muted)] font-mono">{subtext}</span>
        )}
      </div>
    </Component>
  );
}
