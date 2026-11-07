import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  overview: 'Overview Dashboard',
  command: 'Autonomous Command Center',
  agents: 'Multi-Agent Fleet Studio',
  workflows: 'Workflow Orchestration Studio',
  memory: 'Shared Intelligence Memory Hub',
  monitor: 'Real-Time Telemetry Monitor',
  approvals: 'Governance & Approval Gates',
  integrations: 'Integrations & OpenCode Hub',
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
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-accent)] selection:text-black">
      <Sidebar
        currentView={currentView}
        onSelectView={onSelectView}
        pendingApprovalsCount={pendingApprovalsCount}
        activeExecutionsCount={activeExecutionsCount}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gradient-to-br from-[#090d16] via-[#0b1120] to-[#090d16]">
        <Header
          currentViewTitle={viewTitles[currentView]}
          health={health}
          runtime={runtime}
          switchStatus={switchStatus}
          isStreaming={isStreaming}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />

        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Subtle Ambient Cyber Glow Background Orbs */}
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[var(--color-accent-soft)] rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-cool-soft)] rounded-full blur-[160px] pointer-events-none -z-10" />

          <div className="max-w-[1440px] mx-auto min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{
                  type: 'spring',
                  damping: 26,
                  stiffness: 280,
                  mass: 0.8,
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
