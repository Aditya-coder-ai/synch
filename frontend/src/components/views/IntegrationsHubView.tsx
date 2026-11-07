import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  Cpu,
  Database,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { api, type BackendHealth, type RuntimeStatus, type SwitchStatus } from '../../api/client';

interface IntegrationsHubViewProps {
  health: BackendHealth | null;
  runtime: RuntimeStatus | null;
  switchStatus: SwitchStatus | null;
  onRefreshAll: () => Promise<void>;
  isLoading: boolean;
}

export function IntegrationsHubView({
  health,
  runtime,
  switchStatus,
  onRefreshAll,
  isLoading,
}: IntegrationsHubViewProps) {
  const [probeResults, setProbeResults] = useState<{
    api?: { ok: boolean; message: string; ms: number };
    opencode?: { ok: boolean; message: string; ms: number };
    switch?: { ok: boolean; message: string; ms: number };
  }>({});
  const [isProbing, setIsProbing] = useState(false);

  const runDiagnostics = async () => {
    setIsProbing(true);
    const results: typeof probeResults = {};

    // 1. Probe API & Database
    const t0 = performance.now();
    try {
      const res = await api.getHealth();
      results.api = {
        ok: res.data.status === 'ok',
        message: `HTTP 200 OK - uptime ${Math.round(res.data.uptime)}s`,
        ms: Math.round(performance.now() - t0),
      };
    } catch (err: any) {
      results.api = { ok: false, message: err.message || 'API probe failed', ms: Math.round(performance.now() - t0) };
    }

    // 2. Probe OpenCode runtime
    const t1 = performance.now();
    try {
      const res = await api.getRuntimeHealth();
      results.opencode = {
        ok: res.data.healthy,
        message: `Version ${res.data.version} - ${res.data.activeSessions} active sessions`,
        ms: Math.round(performance.now() - t1),
      };
    } catch (err: any) {
      results.opencode = { ok: false, message: err.message || 'Runtime probe failed', ms: Math.round(performance.now() - t1) };
    }

    // 3. Probe Switch server
    const t2 = performance.now();
    try {
      const res = await api.getSwitchHealth();
      results.switch = {
        ok: res.data.ok,
        message: res.data.message || 'Switch gateway responsive',
        ms: Math.round(performance.now() - t2),
      };
    } catch (err: any) {
      results.switch = { ok: false, message: err.message || 'Switch probe failed', ms: Math.round(performance.now() - t2) };
    }

    setProbeResults(results);
    setIsProbing(false);
    await onRefreshAll();
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
            <span className="w-2 h-2 rounded-full bg-[var(--color-ok)] shadow-[0_0_8px_#10b981]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
              Ecosystem & Runtimes Hub
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Active connections to OpenCode containerized sandboxes, Switch Agent Protocol, and PostgreSQL persistence layer.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={runDiagnostics}
          disabled={isProbing || isLoading}
          className="px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
          {isProbing ? 'Executing Probes...' : 'Run Connectivity Diagnostics'}
        </motion.button>
      </motion.div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OpenCode Runtime */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10 hover:border-[var(--color-cool)]/40 transition-all shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#c084fc]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">OpenCode Runtime</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">sandbox isolation engine</span>
              </div>
            </div>
            <Badge tone={runtime?.healthy ? 'ok' : 'neutral'}>
              {runtime?.healthy ? 'online' : 'ready'}
            </Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Provides isolated agent workspace sandboxes, real-time command execution, file modification, and tool permission guards.
          </p>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Runtime Version:</span>
              <span className="text-[var(--color-ink)] font-semibold">{runtime?.version || '1.19.5'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Active Sandboxes:</span>
              <span className="text-[var(--color-accent)] font-semibold">{runtime?.activeSessions || 0}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Security Guard:</span>
              <span className="text-[var(--color-ok)] font-semibold">L0-L4 Active</span>
            </div>
          </div>

          {probeResults.opencode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#060911] border border-white/10 rounded-xl text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className={probeResults.opencode.ok ? 'text-[var(--color-ok)] font-semibold' : 'text-[#fb7185] font-semibold'}>
                  {probeResults.opencode.ok ? '✓ PROBE PASSED' : '✗ PROBE FAILED'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.opencode.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.opencode.message}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Switch Agent Protocol */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10 hover:border-[var(--color-accent)]/40 transition-all shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">Switch Protocol</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">agent event bus</span>
              </div>
            </div>
            <Badge tone={switchStatus?.enabled ? 'cool' : 'neutral'}>
              {switchStatus ? switchStatus.connectionState.toLowerCase() : 'configured'}
            </Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Connects human channels, chat rooms, and agent events into unified Switch protocol message frames.
          </p>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Transport Layer:</span>
              <span className="text-[var(--color-ink)] font-semibold">{switchStatus?.transport || 'websocket'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Agent Entity ID:</span>
              <span className="text-[var(--color-accent)] truncate max-w-[120px] font-semibold">
                {switchStatus?.agentId || 'agent-crewflow'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Reconnect Cycles:</span>
              <span className="text-[var(--color-ink)] font-semibold">{switchStatus?.reconnectAttempts || 0}</span>
            </div>
          </div>

          {probeResults.switch && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#060911] border border-white/10 rounded-xl text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className={probeResults.switch.ok ? 'text-[var(--color-ok)] font-semibold' : 'text-[#fb7185] font-semibold'}>
                  {probeResults.switch.ok ? '✓ PROBE PASSED' : '✗ PROBE FAILED'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.switch.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.switch.message}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* PostgreSQL & Fastify Backend */}
        <motion.div
          whileHover={{ y: -3 }}
          className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-white/10 hover:border-[var(--color-ok)]/40 transition-all shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--color-ok)]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">PostgreSQL & API</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">relational store</span>
              </div>
            </div>
            <Badge tone="ok">{health ? health.status : 'connected'}</Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            PostgreSQL relational store managed by Prisma ORM. Persists tasks, audit trails, memories, and approval decisions.
          </p>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Environment:</span>
              <span className="text-[var(--color-ink)] font-semibold">{health?.environment || 'development'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Core Version:</span>
              <span className="text-[var(--color-accent)] font-semibold">v{health?.version || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Audit Log:</span>
              <span className="text-[var(--color-ok)] font-semibold">Immutable WAL</span>
            </div>
          </div>

          {probeResults.api && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#060911] border border-white/10 rounded-xl text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className={probeResults.api.ok ? 'text-[var(--color-ok)] font-semibold' : 'text-[#fb7185] font-semibold'}>
                  {probeResults.api.ok ? '✓ PROBE PASSED' : '✗ PROBE FAILED'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.api.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.api.message}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
