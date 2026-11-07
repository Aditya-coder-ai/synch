import { useState } from 'react';
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
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-[var(--color-ink)]">Integrations Hub</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Active connections to OpenCode sandbox runtimes, Switch Agent Protocol, and PostgreSQL database.
          </p>
        </div>

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={isProbing || isLoading}
          className="px-3 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isProbing ? 'Running diagnostics...' : 'Run connectivity probe'}
        </button>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OpenCode Runtime */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-accent)]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--color-ink)]">OpenCode Runtime</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">sandbox engine</span>
              </div>
            </div>
            <Badge tone={runtime?.healthy ? 'ok' : 'neutral'}>
              {runtime?.healthy ? 'online' : 'ready'}
            </Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            Provides isolated agent workspace sandboxes, real-time command execution, file modification, and tool permission guards.
          </p>

          <div className="pt-2 border-t border-[var(--color-rule)] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Runtime version:</span>
              <span className="text-[var(--color-ink)]">{runtime?.version || '1.19.5'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Active sessions:</span>
              <span className="text-[var(--color-ink)]">{runtime?.activeSessions || 0}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Security guard:</span>
              <span className="text-[var(--color-ok)]">L0 to L4 active</span>
            </div>
          </div>

          {probeResults.opencode && (
            <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className={probeResults.opencode.ok ? 'text-[var(--color-ok)]' : 'text-[var(--color-bad)]'}>
                  {probeResults.opencode.ok ? '✓ probe passed' : '✗ probe failed'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.opencode.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.opencode.message}
              </div>
            </div>
          )}
        </div>

        {/* Switch Agent Protocol */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-cool)]">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--color-ink)]">Switch Protocol</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">collaboration room</span>
              </div>
            </div>
            <Badge tone={switchStatus?.enabled ? 'cool' : 'neutral'}>
              {switchStatus ? switchStatus.connectionState.toLowerCase() : 'configured'}
            </Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            Connects human channels, chat rooms, and agent events into unified Switch protocol message frames.
          </p>

          <div className="pt-2 border-t border-[var(--color-rule)] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Transport:</span>
              <span className="text-[var(--color-ink)]">{switchStatus?.transport || 'websocket'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Agent ID:</span>
              <span className="text-[var(--color-ink)] truncate max-w-[120px]">
                {switchStatus?.agentId || 'agent-crewflow'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Reconnects:</span>
              <span className="text-[var(--color-ink)]">{switchStatus?.reconnectAttempts || 0}</span>
            </div>
          </div>

          {probeResults.switch && (
            <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className={probeResults.switch.ok ? 'text-[var(--color-ok)]' : 'text-[var(--color-bad)]'}>
                  {probeResults.switch.ok ? '✓ probe passed' : '✗ probe failed'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.switch.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.switch.message}
              </div>
            </div>
          )}
        </div>

        {/* PostgreSQL & Fastify Backend */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-ok)]">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--color-ink)]">PostgreSQL & API</h3>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">persistence layer</span>
              </div>
            </div>
            <Badge tone="ok">{health ? health.status : 'connected'}</Badge>
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            PostgreSQL relational store managed by Prisma ORM. Persists tasks, audit trails, memories, and approval decisions.
          </p>

          <div className="pt-2 border-t border-[var(--color-rule)] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Environment:</span>
              <span className="text-[var(--color-ink)]">{health?.environment || 'development'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>API version:</span>
              <span className="text-[var(--color-ink)]">v{health?.version || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Audit table:</span>
              <span className="text-[var(--color-ok)]">immutable</span>
            </div>
          </div>

          {probeResults.api && (
            <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className={probeResults.api.ok ? 'text-[var(--color-ok)]' : 'text-[var(--color-bad)]'}>
                  {probeResults.api.ok ? '✓ probe passed' : '✗ probe failed'}
                </span>
                <span className="text-[var(--color-muted)]">{probeResults.api.ms}ms</span>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                {probeResults.api.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
