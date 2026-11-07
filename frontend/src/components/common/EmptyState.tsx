import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center border border-dashed border-[var(--color-rule)] rounded-[var(--radius-card)] bg-[var(--color-paper-2)] ${className}`}
    >
      {Icon && (
        <div className="p-3 mb-3 rounded-full bg-[var(--color-paper-3)] text-[var(--color-muted)]">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-sm font-medium text-[var(--color-ink)]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[var(--color-muted)] max-w-sm">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
