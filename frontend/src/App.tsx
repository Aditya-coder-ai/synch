import { useEffect, useState, useCallback, useRef } from 'react';
import {
  api,
  type BackendHealth,
  type RuntimeStatus,
  type SwitchStatus,
  type ApprovalItem,
  type MemoryItem,
  type OrchestrationSummary,
  type StreamChunk,
} from './api/client';
import { AppShell } from './components/layout/AppShell';
import type { ViewKey } from './components/layout/Sidebar';
import { OverviewView } from './components/views/OverviewView';
import { CommandCenterView, type ExecutionMode } from './components/views/CommandCenterView';
import { AgentStudioView } from './components/views/AgentStudioView';
import { WorkflowStudioView } from './components/views/WorkflowStudioView';
import { MemoryHubView } from './components/views/MemoryHubView';
import { LiveMonitorView } from './components/views/LiveMonitorView';
import { ApprovalCenterView } from './components/views/ApprovalCenterView';
import { IntegrationsHubView } from './components/views/IntegrationsHubView';

export function App() {
  const [currentView, setCurrentView] = useState<ViewKey>('overview');
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [switchStatus, setSwitchStatus] = useState<SwitchStatus | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [currentOrchestration, setCurrentOrchestration] = useState<OrchestrationSummary | null>(null);
  const [streamLogs, setStreamLogs] = useState<StreamChunk[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const streamCleanupRef = useRef<(() => void) | null>(null);

  // Load telemetry from backend
  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, runtimeRes, switchRes, approvalsRes, memoriesRes] = await Promise.allSettled([
        api.getHealth(),
        api.getRuntimeHealth(),
        api.getSwitchStatus(),
        api.getApprovals(),
        api.getProjectMemories('proj-default'),
      ]);

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      if (runtimeRes.status === 'fulfilled') setRuntime(runtimeRes.value.data);
      if (switchRes.status === 'fulfilled') setSwitchStatus(switchRes.value.data);
      if (approvalsRes.status === 'fulfilled') setApprovals(approvalsRes.value.data);
      if (memoriesRes.status === 'fulfilled') setMemories(memoriesRes.value.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Keyboard navigation hotkeys (1-8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const keyMap: Record<string, ViewKey> = {
        '1': 'overview',
        '2': 'command',
        '3': 'agents',
        '4': 'workflows',
        '5': 'memory',
        '6': 'monitor',
        '7': 'approvals',
        '8': 'integrations',
      };
      if (keyMap[e.key]) {
        setCurrentView(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup SSE stream on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, []);

  // Connect Server-Sent Events stream for an active orchestration
  const connectSSE = useCallback((orchestrationId: string) => {
    if (streamCleanupRef.current) {
      streamCleanupRef.current();
      streamCleanupRef.current = null;
    }

    setIsStreaming(true);
    const cleanup = api.streamOrchestration(
      orchestrationId,
      (chunk) => {
        setStreamLogs((prev) => [...prev, chunk]);
        if (
          chunk.eventType === 'orchestration:completed' ||
          chunk.eventType === 'orchestration:failed'
        ) {
          setIsStreaming(false);
          setIsExecuting(false);
          loadWorkspaceData();
        }
      },
      () => {
        setIsStreaming(false);
      }
    );

    streamCleanupRef.current = cleanup;
  }, [loadWorkspaceData]);

  // Start orchestration
  const handleStartOrchestration = async (objective: string, _mode: ExecutionMode) => {
    setIsExecuting(true);
    try {
      const res = await api.startOrchestration(objective, 'proj-default');
      setCurrentOrchestration(res.data);
      connectSSE(res.data.orchestrationId);
      await loadWorkspaceData();
    } catch (err) {
      console.error('Failed to start orchestration:', err);
      setIsExecuting(false);
    }
  };

  // Cancel orchestration
  const handleCancelOrchestration = async (id: string, reason?: string) => {
    try {
      await api.cancelOrchestration(id, reason);
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      setIsStreaming(false);
      setIsExecuting(false);
      if (currentOrchestration && currentOrchestration.orchestrationId === id) {
        setCurrentOrchestration((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }
      await loadWorkspaceData();
    } catch (err) {
      console.error('Failed to cancel orchestration:', err);
    }
  };

  // Human approval handlers
  const handleApproveAction = async (id: string, reason?: string) => {
    await api.approveAction(id, reason);
    await loadWorkspaceData();
  };

  const handleRejectAction = async (id: string, reason?: string) => {
    await api.rejectAction(id, reason);
    await loadWorkspaceData();
  };

  // Template pre-fill
  const handleSelectTemplateObjective = (templateObjective: string) => {
    setCurrentView('command');
    // Start or load into command center
    handleStartOrchestration(templateObjective, 'AUTO_DAG');
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const activeExecutionsCount = isExecuting ? 1 : 0;

  return (
    <AppShell
      currentView={currentView}
      onSelectView={setCurrentView}
      pendingApprovalsCount={pendingApprovalsCount}
      activeExecutionsCount={activeExecutionsCount}
      health={health}
      runtime={runtime}
      switchStatus={switchStatus}
      isStreaming={isStreaming}
      onRefresh={loadWorkspaceData}
      isLoading={isLoading}
    >
      {currentView === 'overview' && (
        <OverviewView
          health={health}
          runtime={runtime}
          switchStatus={switchStatus}
          approvals={approvals}
          memories={memories}
          recentOrchestration={currentOrchestration}
          onNavigate={setCurrentView}
          onApproveAction={handleApproveAction}
          onRejectAction={handleRejectAction}
        />
      )}

      {currentView === 'command' && (
        <CommandCenterView
          onStartOrchestration={handleStartOrchestration}
          onCancelOrchestration={handleCancelOrchestration}
          currentOrchestration={currentOrchestration}
          isExecuting={isExecuting}
          streamLogs={streamLogs}
          isStreaming={isStreaming}
          onClearLogs={() => setStreamLogs([])}
        />
      )}

      {currentView === 'agents' && <AgentStudioView />}

      {currentView === 'workflows' && (
        <WorkflowStudioView onSelectTemplateObjective={handleSelectTemplateObjective} />
      )}

      {currentView === 'memory' && (
        <MemoryHubView memories={memories} onRefreshMemories={loadWorkspaceData} />
      )}

      {currentView === 'monitor' && (
        <LiveMonitorView
          currentOrchestration={currentOrchestration}
          streamLogs={streamLogs}
          isStreaming={isStreaming}
          onClearLogs={() => setStreamLogs([])}
          onCancelOrchestration={handleCancelOrchestration}
        />
      )}

      {currentView === 'approvals' && (
        <ApprovalCenterView
          approvals={approvals}
          onApproveAction={handleApproveAction}
          onRejectAction={handleRejectAction}
        />
      )}

      {currentView === 'integrations' && (
        <IntegrationsHubView
          health={health}
          runtime={runtime}
          switchStatus={switchStatus}
          onRefreshAll={loadWorkspaceData}
          isLoading={isLoading}
        />
      )}
    </AppShell>
  );
}

export default App;
