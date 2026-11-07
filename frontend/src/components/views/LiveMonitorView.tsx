import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Maximize2,
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-[#0e1424]/95 via-[#141c32]/85 to-[#0e1424]/95 backdrop-blur-xl border border-[var(--color-rule-2)] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_#00f2fe]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
              Real-Time Telemetry Monitor
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Continuous Server-Sent Events (SSE) stream buffer. Live stdout, stderr, agent state transitions, and tool calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone={isStreaming ? 'accent' : 'neutral'} className="flex items-center gap-1.5 px-3 py-1">
            <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'animate-pulse text-[var(--color-accent)]' : ''}`} />
            {isStreaming ? 'SSE STREAM ACTIVE' : 'STREAM IDLE'}
          </Badge>

          {currentOrchestration && currentOrchestration.status === 'RUNNING' && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onCancelOrchestration(currentOrchestration.orchestrationId)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#f43f5e] text-[#fb7185] bg-[#f43f5e]/15 rounded-xl hover:bg-[#f43f5e]/25 transition-all flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              Cancel Run
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Active Session Card */}
      {currentOrchestration ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10 shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">
                ACTIVE ORCHESTRATION: {currentOrchestration.orchestrationId}
              </span>
              <h3 className="text-sm font-semibold text-[var(--color-ink)] mt-1">
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

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[var(--color-muted)] block text-[11px]">Tasks Planned</span>
              <span className="font-semibold text-[var(--color-ink)] mt-1 block">
                {currentOrchestration.tasksCount} DAG nodes
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[var(--color-muted)] block text-[11px]">Active Workers</span>
              <span className="font-semibold text-[var(--color-accent)] mt-1 block">
                {currentOrchestration.assignedAgents?.length || 0} agents
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[var(--color-muted)] block text-[11px]">Stream Chunks</span>
              <span className="font-semibold text-[#c084fc] mt-1 block">
                {streamLogs.length} events
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[var(--color-muted)] block text-[11px]">Protocol</span>
              <span className="font-semibold text-[var(--color-ok)] mt-1 block">text/event-stream</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <EmptyState
          icon={Clock}
          title="No active session streaming"
          description="Initiate a task in Command Center to monitor live stdout, stderr, and agent state transitions in real time."
        />
      )}

      {/* Futuristic Cyber Terminal Console Panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-[#060911] border border-white/10 shadow-2xl overflow-hidden relative scanline-overlay"
      >
        {/* Terminal Controls Bar */}
        <div className="p-4 bg-[#0e1424]/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f43f5e]/80" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]/80" />
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-mono font-medium text-[var(--color-ink)]">
                crewflow-telemetry.stream
              </span>
              <span className="text-xs font-mono text-[var(--color-muted)]">
                ({filteredLogs.length} entries)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-[11px] font-mono bg-[#090d16] p-1 rounded-xl border border-white/10">
              {(['all', 'stdout', 'stderr', 'approval', 'event'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterType === t
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/40 shadow-[0_0_8px_rgba(0,242,254,0.2)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <label className="text-[11px] text-[var(--color-muted)] flex items-center gap-1.5 cursor-pointer font-mono select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-[var(--color-accent)] focus:ring-0"
                />
                autoscroll
              </label>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onClearLogs}
                title="Clear console"
                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={handleExportLogs}
                disabled={streamLogs.length === 0}
                title="Export logs as txt"
                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <Download className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Console Log Feed */}
        <div className="p-5 font-mono text-xs max-h-[520px] min-h-[340px] overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-[var(--color-muted)] italic py-16 text-center">
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
                  className="flex items-start gap-3 leading-relaxed hover:bg-white/[0.02] px-2 py-1 rounded-lg transition-colors"
                >
                  <span className="text-[11px] text-[var(--color-muted-2)] shrink-0 select-none">
                    {chunk.timestamp ? `${chunk.timestamp.split('T')[1]?.slice(0, 8)} UTC` : '--:--:-- UTC'}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                      isErr
                        ? 'text-[#fb7185] bg-[#f43f5e]/20 border border-[#f43f5e]/30'
                        : isOut
                        ? 'text-[var(--color-accent)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30'
                        : isAppr
                        ? 'text-[#fbbf24] bg-[#f59e0b]/20 border border-[#f59e0b]/30 font-bold'
                        : 'text-[#c084fc] bg-[#a855f7]/20 border border-[#a855f7]/30'
                    }`}
                  >
                    {chunk.eventType}
                  </span>
                  <span
                    className={`break-all ${
                      isErr ? 'text-[#fb7185]' : 'text-[var(--color-ink)]'
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
      </motion.div>
    </div>
  );
}
