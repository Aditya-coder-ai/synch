import React from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-10 text-center border border-dashed border-[var(--color-rule-2)] rounded-2xl bg-[#0e1424]/40 backdrop-blur-md ${className}`}
    >
      {Icon && (
        <div className="relative p-4 mb-4 rounded-2xl bg-white/[0.04] text-[var(--color-accent)] border border-[var(--color-accent)]/20 shadow-[0_0_20px_rgba(0,242,254,0.15)]">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-ink)] tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-[var(--color-muted)] max-w-md leading-relaxed">{description}</p>
      )}
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={action.onClick}
          className="mt-5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
