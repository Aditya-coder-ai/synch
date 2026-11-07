import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Terminal,
  Filter,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Clock,
  Radio,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type { OrchestrationSummary, StreamChunk } from '../../api/client';

interface LiveMonitorViewProps {
  currentOrchestration: OrchestrationSummary | null;
  streamLogs: StreamChunk[];
  isStreaming: boolean;
  onClearLogs: () => void;
  onCancelOrchestration: (id: string) => Promise<void>;
}

export function LiveMonitorView({
  currentOrchestration,
  streamLogs,
  isStreaming,
  onClearLogs,
  onCancelOrchestration,
}: LiveMonitorViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs, autoScroll]);

  const filteredLogs = streamLogs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'stdout') return log.eventType.includes('stdout');
    if (filterType === 'stderr') return log.eventType.includes('stderr');
    if (filterType === 'approval') return log.eventType.includes('approval');
    if (filterType === 'event') return !log.eventType.includes('stdout') && !log.eventType.includes('stderr');
    return true;
  });

  const handleExportLogs = () => {
    const content = streamLogs
      .map(
        (l) =>
          `[${l.timestamp || new Date().toISOString()}] [${l.eventType}] ${l.message}`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crewflow-execution-${currentOrchestration?.orchestrationId || 'session'}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-[var(--color-ink)]">Live Monitor</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Continuous Server-Sent Events (SSE) telemetry feed. Real-time stdout, stderr, agent state transitions, and tool calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={isStreaming ? 'accent' : 'neutral'} className="flex items-center gap-1.5">
            <Radio className={`w-3 h-3 ${isStreaming ? 'text-[var(--color-accent)]' : ''}`} />
            {isStreaming ? 'SSE stream connected' : 'stream idle'}
          </Badge>

          {currentOrchestration && currentOrchestration.status === 'RUNNING' && (
            <button
              type="button"
              onClick={() => onCancelOrchestration(currentOrchestration.orchestrationId)}
              className="px-2.5 py-1 text-xs border border-[var(--color-bad)] text-[var(--color-bad)] rounded-[var(--radius-pill)] hover:bg-[var(--color-bad-soft)] transition-colors flex items-center gap-1"
            >
              <Ban className="w-3 h-3" />
              Cancel session
            </button>
          )}
        </div>
      </div>

      {/* Active Session Card */}
      {currentOrchestration ? (
        <div className="p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-rule)]">
            <div>
              <span className="text-[11px] font-mono text-[var(--color-muted)]">
                Active orchestration: {currentOrchestration.orchestrationId}
              </span>
              <h3 className="text-sm font-medium text-[var(--color-ink)] mt-0.5">
                {currentOrchestration.objective}
              </h3>
            </div>
            <Badge
              tone={
                currentOrchestration.status === 'COMPLETED'
                  ? 'ok'
                  : currentOrchestration.status === 'FAILED'
                  ? 'bad'
                  : 'accent'
              }
            >
              {currentOrchestration.status.toLowerCase()}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[var(--color-muted)] block">Tasks planned</span>
              <span className="font-mono text-[var(--color-ink)]">
                {currentOrchestration.tasksCount} tasks
              </span>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block">Agents assigned</span>
              <span className="font-mono text-[var(--color-ink)]">
                {currentOrchestration.assignedAgents?.length || 0} active
              </span>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block">Stream chunks</span>
              <span className="font-mono text-[var(--color-accent)]">
                {streamLogs.length} events
              </span>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block">Transport</span>
              <span className="font-mono text-[var(--color-cool)]">text/event-stream</span>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="No active session streaming"
          description="Initiate a task in Command Center to monitor live stdout, stderr, and agent state transitions."
        />
      )}

      {/* Terminal Console Panel */}
      <div className="bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] overflow-hidden">
        {/* Terminal Controls Bar */}
        <div className="p-3 bg-[var(--color-paper-2)] border-b border-[var(--color-rule)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-muted)]" />
            <span className="text-xs font-mono text-[var(--color-ink)]">
              live-execution-terminal
            </span>
            <span className="text-xs font-mono text-[var(--color-muted)]">
              ({filteredLogs.length} entries)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              {(['all', 'stdout', 'stderr', 'approval', 'event'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded-[var(--radius-pill)] border transition-colors ${
                    filterType === t
                      ? 'bg-[var(--color-paper)] border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-rule)]">
              <label className="text-[11px] text-[var(--color-muted)] flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-[var(--color-rule)]"
                />
                autoscroll
              </label>

              <button
                type="button"
                onClick={onClearLogs}
                title="Clear console"
                className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportLogs}
                disabled={streamLogs.length === 0}
                title="Export logs as txt"
                className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)] disabled:opacity-30"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Console Log Feed */}
        <div className="p-4 font-mono text-xs max-h-[500px] min-h-[300px] overflow-y-auto space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-[var(--color-muted)] italic py-12 text-center">
              No live telemetry recorded yet. Stream chunks will appear automatically as tasks execute.
            </div>
          ) : (
            filteredLogs.map((chunk, index) => {
              const isErr = chunk.eventType.includes('stderr') || chunk.eventType.includes('failed');
              const isOut = chunk.eventType.includes('stdout');
              const isAppr = chunk.eventType.includes('approval');

              return (
                <div
                  key={chunk.id || index}
                  className="flex items-start gap-2.5 leading-relaxed hover:bg-[var(--color-paper-2)]/30 px-1 py-0.5 rounded"
                >
                  <span className="text-[11px] text-[var(--color-muted)] shrink-0 select-none">
                    {chunk.timestamp ? `${chunk.timestamp.split('T')[1]?.slice(0, 8)} UTC` : '--:--:-- UTC'}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isErr
                        ? 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]'
                        : isOut
                        ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                        : isAppr
                        ? 'text-[var(--color-bad)] bg-[var(--color-bad-soft)] font-medium'
                        : 'text-[var(--color-cool)] bg-[var(--color-cool-soft)]'
                    }`}
                  >
                    {chunk.eventType}
                  </span>
                  <span
                    className={`break-all ${
                      isErr ? 'text-[var(--color-bad)]' : 'text-[var(--color-ink)]'
                    }`}
                  >
                    {chunk.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}

