import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Users2,
  Workflow,
  Database,
  Activity,
  ShieldAlert,
  Boxes,
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
    <aside className="w-64 shrink-0 bg-[var(--color-paper-2)] border-r border-[var(--color-rule)] flex flex-col justify-between select-none">
      <div className="p-4">
        <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-[var(--color-rule)]">
          <div className="w-7 h-7 rounded-[var(--radius-pill)] bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-accent-ink)] font-bold text-sm">
            CF
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">CrewFlow</span>
            <span className="text-xs text-[var(--color-muted)] font-mono">Agent OS v1.2</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectView(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-pill)] text-xs font-normal text-left transition-colors ${
                  isActive
                    ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] border border-[var(--color-rule-2)]'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.key === 'approvals' && pendingApprovalsCount > 0 && (
                    <Badge tone="warning" className="px-1.5 py-0">
                      {pendingApprovalsCount}
                    </Badge>
                  )}
                  {item.key === 'monitor' && activeExecutionsCount > 0 && (
                    <Badge tone="cool" className="px-1.5 py-0">
                      {activeExecutionsCount}
                    </Badge>
                  )}
                  {item.hotkey && (
                    <span className="hidden lg:inline text-[10px] text-[var(--color-muted)] font-mono px-1 py-0.5 rounded bg-[var(--color-paper)]">
                      {item.hotkey}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-mono">
          <span>PostgreSQL · Prisma</span>
          <span className="text-[var(--color-ok)]">connected</span>
        </div>
        <div className="mt-2 text-xs text-[var(--color-muted)]">
          Autonomous multi-agent runtime with L0 to L4 risk governance.
        </div>
      </div>
    </aside>
  );
}
