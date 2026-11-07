import React from 'react';
import { motion } from 'framer-motion';
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
    accent: 'text-[var(--color-accent)] drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]',
    cool: 'text-[#c084fc] drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    ok: 'text-[#34d399] drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    bad: 'text-[#fb7185] drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]',
  };

  const toneBgClasses = {
    default: 'bg-white/[0.04] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/30',
    cool: 'bg-[var(--color-cool-soft)] text-[#c084fc] border border-[#a855f7]/30',
    ok: 'bg-[var(--color-ok-soft)] text-[#34d399] border border-[#10b981]/30',
    bad: 'bg-[var(--color-bad-soft)] text-[#fb7185] border border-[#f43f5e]/30',
  };

  return (
    <motion.div
      whileHover={onClick ? { y: -3, scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative overflow-hidden flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg text-left w-full transition-all duration-300 ${
        onClick ? 'hover:border-[var(--color-accent)]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,242,254,0.12)] cursor-pointer' : ''
      }`}
    >
      {/* Top Holographic Hairline Glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent" />

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs text-[var(--color-muted)] font-medium tracking-wide uppercase">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toneBgClasses[tone]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className={`text-3xl font-mono font-bold tracking-tight tabular-nums ${toneValueClasses[tone]}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-[var(--color-muted)] font-mono">{subtext}</span>
        )}
      </div>
    </motion.div>
  );
}
