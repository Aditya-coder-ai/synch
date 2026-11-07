import { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';
import type { BackendHealth, RuntimeStatus, SwitchStatus } from '../../api/client';

interface HeaderProps {
  currentViewTitle: string;
  health: BackendHealth | null;
  runtime: RuntimeStatus | null;
  switchStatus: SwitchStatus | null;
  isStreaming: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export function Header({
  currentViewTitle,
  health,
  runtime,
  switchStatus,
  isStreaming,
  onRefresh,
  isLoading,
}: HeaderProps) {
  const [utcTime, setUtcTime] = useState<string>(() => {
    return new Date().toISOString().slice(11, 19) + ' UTC';
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toISOString().slice(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-[var(--color-ink)]">{currentViewTitle}</h1>
        <span className="text-xs text-[var(--color-muted)] font-mono">
          workspace / proj-default
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Scandinavian UTC Precision Clock */}
        <span className="text-xs font-mono text-[var(--color-muted)] tabular-nums hidden sm:inline">
          {utcTime}
        </span>

        {isStreaming && (
          <Badge tone="accent" className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            live stream active
          </Badge>
        )}

        <div className="hidden md:flex items-center gap-2">
          {health && (
            <Badge tone="ok">
              api {health.status}
            </Badge>
          )}

          {runtime && (
            <Badge tone={runtime.healthy ? 'ok' : 'bad'}>
              opencode {runtime.healthy ? 'ready' : 'offline'}
            </Badge>
          )}

          {switchStatus && (
            <Badge tone={switchStatus.enabled ? 'cool' : 'neutral'}>
              switch {switchStatus.connectionState.toLowerCase()}
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh workspace telemetry"
          className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-rule)]">
          <div className="w-6 h-6 bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] flex items-center justify-center text-xs font-mono text-[var(--color-ink-2)]">
            A
          </div>
          <span className="text-xs font-mono text-[var(--color-ink-2)] hidden sm:inline">
            admin
          </span>
        </div>
      </div>
    </header>
  );
}
