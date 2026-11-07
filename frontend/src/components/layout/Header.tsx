import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Cpu, Server, Radio, Shield } from 'lucide-react';
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
    <header className="h-16 border-b border-[var(--color-rule)] bg-[#090d16]/80 backdrop-blur-xl px-6 flex items-center justify-between select-none z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_#00f2fe]" />
          <h1 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
            {currentViewTitle}
          </h1>
        </div>
        <span className="text-xs text-[var(--color-muted)] font-mono px-2 py-0.5 rounded-md border border-[var(--color-rule)] bg-[#0e1424]">
          env: production / proj-default
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time UTC Precision Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[#0e1424]/80 text-xs font-mono text-[var(--color-muted)] tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cool)]" />
          {utcTime}
        </div>

        {isStreaming && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Badge tone="accent" className="flex items-center gap-1.5 px-2.5 py-1 shadow-[0_0_12px_rgba(0,242,254,0.3)]">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>LIVE SSE STREAM</span>
            </Badge>
          </motion.div>
        )}

        <div className="hidden md:flex items-center gap-2">
          {health && (
            <Badge tone="ok" className="flex items-center gap-1">
              <Server className="w-3 h-3" />
              API {health.status}
            </Badge>
          )}

          {runtime && (
            <Badge tone={runtime.healthy ? 'ok' : 'bad'} className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              OpenCode {runtime.healthy ? 'ready' : 'offline'}
            </Badge>
          )}

          {switchStatus && (
            <Badge tone={switchStatus.enabled ? 'cool' : 'neutral'} className="flex items-center gap-1">
              <Radio className="w-3 h-3" />
              Switch {switchStatus.connectionState.toLowerCase()}
            </Badge>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92, rotate: 180 }}
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh workspace telemetry"
          className="p-2 text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 rounded-xl bg-[#0e1424] border border-[var(--color-rule)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--color-accent)]' : ''}`} />
        </motion.button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--color-rule)]">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--color-paper-3)] to-[#1f293d] border border-[var(--color-rule-2)] flex items-center justify-center text-xs font-mono font-semibold text-[var(--color-accent)] shadow-sm">
            OA
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[var(--color-ok)] border border-[#090d16]" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-[var(--color-ink)] leading-tight">Operator Admin</span>
            <span className="text-[10px] font-mono text-[var(--color-muted)]">governance root</span>
          </div>
        </div>
      </div>
    </header>
  );
}
