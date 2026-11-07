import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Trash2,
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule-2)] shadow-xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_#00f2fe]" />
              <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
                Autonomous Mission Prompt
              </h2>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              State your operational goal. The Coordinator decomposes tasks into a topological DAG, selects specialized agents, and executes sandboxed workflows.
            </p>
          </div>
          <Badge tone="accent">READY</Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="E.g., Implement rate limiting middleware and integrate with PostgreSQL audit logging…"
              rows={3}
              disabled={isExecuting}
              className="w-full p-4 text-xs font-mono bg-[#090d16]/90 border border-white/10 rounded-xl text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 focus:outline-none resize-none transition-all shadow-inner"
            />
            <div className="absolute right-3 bottom-3 text-[10px] font-mono text-[var(--color-muted-2)]">
              natural language → DAG
            </div>
          </div>

          {/* Mode Selector and Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-muted)] font-mono">Mode:</span>
              {(['AUTO_DAG', 'PLAN_ONLY', 'STRICT_GOVERN'] as const).map((m) => {
                const isSelected = executionMode === m;
                const labels: Record<string, string> = {
                  AUTO_DAG: '⚡ Auto-Execute DAG',
                  PLAN_ONLY: '📋 Plan Only',
                  STRICT_GOVERN: '🛡️ Strict Governance',
                };
                return (
                  <motion.button
                    key={m}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExecutionMode(m)}
                    className={`relative px-3 py-1.5 text-xs rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold shadow-[0_0_12px_rgba(0,242,254,0.2)] bg-[var(--color-accent-soft)]'
                        : 'border-white/10 text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white/[0.04]'
                    }`}
                  >
                    {labels[m]}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={!objective.trim() || isExecuting}
              className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] disabled:opacity-40 transition-all flex items-center justify-center gap-2 self-end sm:self-auto shrink-0"
            >
              {isExecuting ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Plan…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Dispatch Mission</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-3 border-t border-white/5">
            <span className="text-[11px] text-[var(--color-muted)] font-mono block mb-2">Operational Presets:</span>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <motion.button
                  key={preset}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setObjective(preset)}
                  disabled={isExecuting}
                  className="px-2.5 py-1.5 text-[11px] text-left text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[#090d16] border border-white/10 rounded-lg hover:border-[var(--color-accent)]/40 transition-all"
                >
                  {preset}
                </motion.button>
              ))}
            </div>
          </div>
        </form>
      </motion.div>

      {/* Execution Session Details & Output */}
      {currentOrchestration && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-b from-[#0e1424]/95 to-[#090d16]/95 backdrop-blur-2xl border border-[var(--color-rule-2)] shadow-xl overflow-hidden"
        >
          {/* Header Row */}
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--color-accent)]">
                  SESSION: {currentOrchestration.orchestrationId}
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
              <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-1">
                {currentOrchestration.objective}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {currentOrchestration.status === 'RUNNING' && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => onCancelOrchestration(currentOrchestration.orchestrationId)}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#f43f5e] text-[#fb7185] bg-[#f43f5e]/10 rounded-xl hover:bg-[#f43f5e]/20 transition-all flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Halt Execution
                </motion.button>
              )}
            </div>
          </div>

          {/* Sub-nav Tabs */}
          <div className="flex items-center px-4 border-b border-white/10 bg-[#090d16]/60">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'plan'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Execution Plan ({currentOrchestration.tasksCount} Tasks)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stream')}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'stream'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Live SSE Stream ({streamLogs.length})
              {isStreaming && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'raw'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Session DAG Payload
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeTab === 'plan' && (
              <div className="space-y-3">
                {currentOrchestration.plan?.tasks?.map((task, idx) => (
                  <motion.div
                    key={task.id || idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-[#090d16]/80 border border-white/10 rounded-xl hover:border-[var(--color-accent)]/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-[var(--color-accent)]">
                          STEP #{idx + 1}
                        </span>
                        <h4 className="text-xs font-semibold text-[var(--color-ink)]">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="cool">{task.suggestedRole || 'DEVELOPER'}</Badge>
                        <Badge tone="neutral">{task.priority || 'MEDIUM'}</Badge>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">{task.description}</p>

                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[11px] text-[var(--color-muted)] font-mono">
                        Dependencies: {task.dependencies.join(', ')}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                  <span className="font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    SSE Stream Log Buffer
                  </span>
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="hover:text-[var(--color-accent)] text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear logs
                  </button>
                </div>
                <div className="p-4 bg-[#060911] border border-white/10 rounded-xl font-mono text-xs max-h-80 overflow-y-auto space-y-1.5 shadow-inner">
                  {streamLogs.length === 0 ? (
                    <div className="text-[var(--color-muted)] italic py-8 text-center">
                      Waiting for stream events from execution engine…
                    </div>
                  ) : (
                    streamLogs.map((log, index) => (
                      <div key={log.id || index} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-[var(--color-muted-2)] shrink-0 select-none text-[11px]">
                          {log.timestamp ? `${log.timestamp.split('T')[1]?.slice(0, 8)} UTC` : '--:--:-- UTC'}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            log.eventType.includes('stderr')
                              ? 'text-[#fb7185] bg-[#f43f5e]/20'
                              : log.eventType.includes('stdout')
                              ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                              : 'text-[#c084fc] bg-[#a855f7]/20'
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
              <pre className="p-4 bg-[#060911] border border-white/10 rounded-xl font-mono text-xs text-[var(--color-ink-2)] overflow-x-auto max-h-80">
                {JSON.stringify(currentOrchestration, null, 2)}
              </pre>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
