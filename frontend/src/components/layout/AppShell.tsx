import React from 'react';
import { Sidebar, type ViewKey } from './Sidebar';
import { Header } from './Header';
import type { BackendHealth, RuntimeStatus, SwitchStatus } from '../../api/client';

interface AppShellProps {
  currentView: ViewKey;
  onSelectView: (view: ViewKey) => void;
  pendingApprovalsCount: number;
  activeExecutionsCount: number;
  health: BackendHealth | null;
  runtime: RuntimeStatus | null;
  switchStatus: SwitchStatus | null;
  isStreaming: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  children: React.ReactNode;
}

const viewTitles: Record<ViewKey, string> = {
  overview: 'Overview',
  command: 'Command Center',
  agents: 'Agent Studio',
  workflows: 'Workflow Studio',
  memory: 'Memory Hub',
  monitor: 'Live Monitor',
  approvals: 'Approval Center',
  integrations: 'Integrations Hub',
};

export function AppShell({
  currentView,
  onSelectView,
  pendingApprovalsCount,
  activeExecutionsCount,
  health,
  runtime,
  switchStatus,
  isStreaming,
  onRefresh,
  isLoading,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-paper)] text-[var(--color-ink)]">
      <Sidebar
        currentView={currentView}
        onSelectView={onSelectView}
        pendingApprovalsCount={pendingApprovalsCount}
        activeExecutionsCount={activeExecutionsCount}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          currentViewTitle={viewTitles[currentView]}
          health={health}
          runtime={runtime}
          switchStatus={switchStatus}
          isStreaming={isStreaming}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-paper)]">
          <div className="max-w-[1440px] mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

