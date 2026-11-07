import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Play,
  ListChecks,
  ShieldCheck,
  Ban,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type { OrchestrationSummary, StreamChunk } from '../../api/client';

export type ExecutionMode = 'AUTO_DAG' | 'PLAN_ONLY' | 'STRICT_GOVERN';

interface CommandCenterViewProps {
  onStartOrchestration: (objective: string, mode: ExecutionMode) => Promise<void>;
  onCancelOrchestration: (id: string, reason?: string) => Promise<void>;
  currentOrchestration: OrchestrationSummary | null;
  isExecuting: boolean;
  streamLogs: StreamChunk[];
  isStreaming: boolean;
  onClearLogs: () => void;
}

export function CommandCenterView({
  onStartOrchestration,
  onCancelOrchestration,
  currentOrchestration,
  isExecuting,
  streamLogs,
  isStreaming,
  onClearLogs,
}: CommandCenterViewProps) {
  const [objective, setObjective] = useState('');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('AUTO_DAG');
  const [activeTab, setActiveTab] = useState<'plan' | 'stream' | 'raw'>('plan');
  const streamBottomRef = useRef<HTMLDivElement>(null);

  const presets = [
    'Refactor authentication layer with JWT validation and bcrypt password hashing',
    'Audit repository permissions, generate threat model and L0-L4 security policies',
    'Build and verify automated test suite for agent shared memory engine',
  ];

  useEffect(() => {
    if (activeTab === 'stream' && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamLogs, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || isExecuting) return;
    onStartOrchestration(objective.trim(), executionMode);
    setActiveTab('stream');
  };

  return (
    <div className="space-y-6">
      {/* Task Input Section */}
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Command Center</h2>
          <p className="text-xs text-[var(--color-muted)]">
            State your operational objective in natural language. Coordinator will decompose the goal, allocate specialized agents, and manage execution.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="E.g., Implement rate limiting middleware and integrate with PostgreSQL audit logging…"
              rows={3}
              disabled={isExecuting}
              className="w-full p-3 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Mode Selector and Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">Mode:</span>
              <button
                type="button"
                onClick={() => setExecutionMode('AUTO_DAG')}
                className={`px-2.5 py-1 text-xs rounded-[var(--radius-pill)] border transition-colors ${
                  executionMode === 'AUTO_DAG'
                    ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-rule)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                }`}
              >
                Auto-Execute DAG
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('PLAN_ONLY')}
                className={`px-2.5 py-1 text-xs rounded-[var(--radius-pill)] border transition-colors ${
                  executionMode === 'PLAN_ONLY'
                    ? 'bg-[var(--color-paper-3)] border-[var(--color-cool)] text-[var(--color-cool)]'
                    : 'border-[var(--color-rule)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                }`}
              >
                Plan Only
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('STRICT_GOVERN')}
                className={`px-2.5 py-1 text-xs rounded-[var(--radius-pill)] border transition-colors ${
                  executionMode === 'STRICT_GOVERN'
                    ? 'bg-[var(--color-paper-3)] border-[var(--color-ok)] text-[var(--color-ok)]'
                    : 'border-[var(--color-rule)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                }`}
              >
                Strict Governance
              </button>
            </div>

            <button
              type="submit"
              disabled={!objective.trim() || isExecuting}
              className="px-4 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5 self-end sm:self-auto shrink-0 whitespace-nowrap"
            >
              {isExecuting ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Running…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Dispatch</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-2 border-t border-[var(--color-rule)]">
            <span className="text-[11px] text-[var(--color-muted)] block mb-1.5">Quick objectives:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setObjective(preset)}
                  disabled={isExecuting}
                  className="px-2 py-1 text-[11px] text-left text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] hover:border-[var(--color-rule-2)] transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Execution Session Details & Output */}
      {currentOrchestration && (
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] overflow-hidden">
          {/* Header Row */}
          <div className="p-4 border-b border-[var(--color-rule)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--color-muted)]">
                  Session: {currentOrchestration.orchestrationId}
                </span>
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
              <h3 className="text-sm font-medium text-[var(--color-ink)] mt-1">
                {currentOrchestration.objective}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {currentOrchestration.status === 'RUNNING' && (
                <button
                  type="button"
                  onClick={() => onCancelOrchestration(currentOrchestration.orchestrationId)}
                  className="px-2.5 py-1 text-xs border border-[var(--color-bad)] text-[var(--color-bad)] rounded-[var(--radius-pill)] hover:bg-[var(--color-bad-soft)] transition-colors flex items-center gap-1"
                >
                  <Ban className="w-3 h-3" />
                  Cancel run
                </button>
              )}
            </div>
          </div>

          {/* Sub-nav Tabs */}
          <div className="flex items-center px-4 border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'plan'
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Execution plan ({currentOrchestration.tasksCount} tasks)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stream')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'stream'
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Live stream ({streamLogs.length})
              {isStreaming && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'raw'
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Session data
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'plan' && (
              <div className="space-y-3">
                {currentOrchestration.plan?.tasks?.map((task, idx) => (
                  <div
                    key={task.id || idx}
                    className="p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-card)]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--color-muted)]">
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-medium text-[var(--color-ink)]">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="cool">{task.suggestedRole || 'DEVELOPER'}</Badge>
                        <Badge tone="neutral">{task.priority || 'MEDIUM'}</Badge>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--color-muted)] mt-1.5">{task.description}</p>

                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--color-rule)] text-[11px] text-[var(--color-muted)] font-mono">
                        Depends on: {task.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
                  <span className="font-mono">Server-Sent Events runtime output</span>
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="hover:text-[var(--color-ink)] text-xs underline"
                  >
                    Clear logs
                  </button>
                </div>
                <div className="p-3 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] font-mono text-xs max-h-80 overflow-y-auto space-y-1">
                  {streamLogs.length === 0 ? (
                    <div className="text-[var(--color-muted)] italic py-4 text-center">
                      Waiting for stream events from execution engine…
                    </div>
                  ) : (
                    streamLogs.map((log, index) => (
                      <div key={log.id || index} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[var(--color-muted)] shrink-0 select-none text-[11px]">
                          {log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : '--:--:--'}
                        </span>
                        <span
                          className={`shrink-0 text-[11px] px-1 rounded ${
                            log.eventType.includes('stderr')
                              ? 'text-[var(--color-bad)] bg-[var(--color-bad-soft)]'
                              : log.eventType.includes('stdout')
                              ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                              : 'text-[var(--color-cool)] bg-[var(--color-cool-soft)]'
                          }`}
                        >
                          {log.eventType}
                        </span>
                        <span className="text-[var(--color-ink)] break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={streamBottomRef} />
                </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <pre className="p-3 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] font-mono text-xs text-[var(--color-ink-2)] overflow-x-auto max-h-80">
                {JSON.stringify(currentOrchestration, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
