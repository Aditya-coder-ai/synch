import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Terminal,
  Users2,
  Workflow,
  Database,
  Activity,
  ShieldAlert,
  Boxes,
  Zap,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export type ViewKey =
  | 'overview'
  | 'command'
  | 'agents'
  | 'workflows'
  | 'memory'
  | 'monitor'
  | 'approvals'
  | 'integrations';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey?: string;
}

const navItems: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, hotkey: '1' },
  { key: 'command', label: 'Command Center', icon: Terminal, hotkey: '2' },
  { key: 'agents', label: 'Agent Studio', icon: Users2, hotkey: '3' },
  { key: 'workflows', label: 'Workflow Studio', icon: Workflow, hotkey: '4' },
  { key: 'memory', label: 'Memory Hub', icon: Database, hotkey: '5' },
  { key: 'monitor', label: 'Live Monitor', icon: Activity, hotkey: '6' },
  { key: 'approvals', label: 'Approval Center', icon: ShieldAlert, hotkey: '7' },
  { key: 'integrations', label: 'Integrations Hub', icon: Boxes, hotkey: '8' },
];

interface SidebarProps {
  currentView: ViewKey;
  onSelectView: (view: ViewKey) => void;
  pendingApprovalsCount: number;
  activeExecutionsCount: number;
}

export function Sidebar({
  currentView,
  onSelectView,
  pendingApprovalsCount,
  activeExecutionsCount,
}: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-[#090d16]/90 backdrop-blur-xl border-r border-[var(--color-rule)] flex flex-col justify-between select-none relative z-20">
      <div className="p-4">
        {/* Brand Header with Glowing Hologram Logo */}
        <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-[var(--color-rule)]">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#a855f7] flex items-center justify-center text-black font-bold text-sm shadow-[0_0_16px_rgba(0,242,254,0.4)]"
          >
            <Zap className="w-4 h-4 fill-current text-[#090d16]" />
            <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#a855f7] opacity-40 blur-sm -z-10 animate-pulse" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-ink)] flex items-center gap-1.5">
              CrewFlow
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-mono border border-[var(--color-accent)]/30">
                PRO
              </span>
            </span>
            <span className="text-[11px] text-[var(--color-muted)] font-mono">Agentic OS v2.0</span>
          </div>
        </div>

        {/* Navigation Items with Flutter-like Spring Indicator */}
        <nav aria-label="Main navigation" className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;
            return (
              <motion.button
                key={item.key}
                type="button"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => onSelectView(item.key)}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-colors ${
                  isActive
                    ? 'text-[var(--color-ink)] font-semibold'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--color-accent-soft)] to-[var(--color-cool-soft)] border border-[var(--color-accent)]/40 shadow-[0_0_15px_rgba(0,242,254,0.15)] -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <div className="flex items-center gap-2.5 z-10">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-[var(--color-accent)] drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]'
                        : 'text-[var(--color-muted)]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 z-10">
                  {item.key === 'approvals' && pendingApprovalsCount > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Badge tone="warning" className="px-1.5 py-0">
                        {pendingApprovalsCount}
                      </Badge>
                    </motion.div>
                  )}
                  {item.key === 'monitor' && activeExecutionsCount > 0 && (
                    <Badge tone="cool" className="px-1.5 py-0">
                      {activeExecutionsCount}
                    </Badge>
                  )}
                  {item.hotkey && (
                    <span className="hidden lg:inline text-[10px] text-[var(--color-muted-2)] font-mono px-1 py-0.5 rounded border border-[var(--color-rule)] bg-[#090d16]">
                      {item.hotkey}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Cyber Status Footer */}
      <div className="p-4 border-t border-[var(--color-rule)] bg-[#0e1424]/60 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-ok)] shadow-[0_0_8px_#10b981]" />
            PostgreSQL & Prisma
          </span>
          <span className="text-[var(--color-ok)] text-[10px] uppercase font-bold tracking-wider">online</span>
        </div>
        <div className="mt-2 text-[11px] text-[var(--color-muted)]">
          Autonomous multi-agent cluster governed by L0 to L4 boundary policies.
        </div>
      </div>
    </aside>
  );
}
