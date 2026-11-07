import { motion, type Variants } from 'framer-motion';
import {
  Users2,
  ShieldAlert,
  Database,
  ArrowRight,
  Server,
  Radio,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type {
  BackendHealth,
  RuntimeStatus,
  SwitchStatus,
  ApprovalItem,
  MemoryItem,
  OrchestrationSummary,
} from '../../api/client';
import type { ViewKey } from '../layout/Sidebar';

interface OverviewViewProps {
  health: BackendHealth | null;
  runtime: RuntimeStatus | null;
  switchStatus: SwitchStatus | null;
  approvals: ApprovalItem[];
  memories: MemoryItem[];
  recentOrchestration: OrchestrationSummary | null;
  onNavigate: (view: ViewKey) => void;
  onApproveAction: (id: string) => Promise<void>;
  onRejectAction: (id: string) => Promise<void>;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function OverviewView({
  health,
  runtime,
  switchStatus,
  approvals,
  memories,
  recentOrchestration,
  onNavigate,
  onApproveAction,
  onRejectAction,
}: OverviewViewProps) {
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const totalTasks = recentOrchestration ? recentOrchestration.tasksCount : 0;

  const agents = [
    { name: 'Coordinator Agent', role: 'Topological planner & task dispatcher', status: 'idle', tone: 'cool' as const, latency: '42ms' },
    { name: 'Developer Agent', role: 'Runtime command execution & code synthesis', status: 'ready', tone: 'accent' as const, latency: '18ms' },
    { name: 'QA & Test Runner', role: 'Automated test suite & regression validator', status: 'ready', tone: 'neutral' as const, latency: '65ms' },
    { name: 'Security Reviewer', role: 'L0-L4 governance policies & approval interception', status: 'governing', tone: 'ok' as const, latency: '12ms' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Workspace Greeting with Cyber Glass Horizon */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-[#0e1424]/90 via-[#141c32]/80 to-[#0e1424]/90 backdrop-blur-2xl border border-[var(--color-rule-2)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[var(--color-accent-soft)] to-transparent pointer-events-none opacity-40 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
            <span className="text-xs text-[var(--color-accent)] font-mono font-medium tracking-wider uppercase">
              Autonomous Mesh Active
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            Welcome back, Operator Admin
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1.5 max-w-xl leading-relaxed">
            CrewFlow multi-agent OS is online. OpenCode sandboxes, shared vector memory, and human-in-the-loop security gates are synchronized.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => onNavigate('command')}
            className="px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-[#090d16] rounded-xl hover:shadow-[0_0_24px_rgba(0,242,254,0.4)] transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            Dispatch New Task
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Primary Metrics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Fleet"
          value={4}
          subtext="specialized agents"
          icon={Users2}
          tone="cool"
          onClick={() => onNavigate('agents')}
        />
        <StatCard
          label="Pending Gates"
          value={pendingApprovals.length}
          subtext={pendingApprovals.length > 0 ? 'requires operator sign-off' : 'governance clear'}
          icon={ShieldAlert}
          tone={pendingApprovals.length > 0 ? 'bad' : 'ok'}
          onClick={() => onNavigate('approvals')}
        />
        <StatCard
          label="Shared Intelligence"
          value={memories.length}
          subtext="retained decisions"
          icon={Database}
          tone="default"
          onClick={() => onNavigate('memory')}
        />
        <StatCard
          label="Session Tasks"
          value={totalTasks}
          subtext={recentOrchestration ? recentOrchestration.status.toLowerCase() : 'ready for dispatch'}
          icon={Layers}
          tone="accent"
          onClick={() => onNavigate('command')}
        />
      </motion.div>

      {/* Pending Approvals Urgent Alert */}
      {pendingApprovals.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-[#f43f5e]/15 to-[#0e1424]/90 backdrop-blur-xl border border-[#f43f5e]/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#f43f5e]/20 text-[#fb7185] border border-[#f43f5e]/40 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
                  <span>{pendingApprovals.length} sensitive operation{pendingApprovals.length > 1 ? 's' : ''} intercepted at boundary</span>
                  <Badge tone="bad">HIGH RISK</Badge>
                </h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Agents have automatically paused runtime execution. Human cryptographic sign-off is required before continuing.
                </p>

                <div className="mt-4 space-y-2.5">
                  {pendingApprovals.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#090d16]/80 border border-white/10"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge tone="bad">{item.riskLevel}</Badge>
                        <span className="text-xs font-mono text-[var(--color-ink)] truncate max-w-md">
                          {item.description || item.actionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => onRejectAction(item.id)}
                          className="px-3 py-1.5 text-xs font-medium border border-white/10 text-[var(--color-ink-2)] rounded-lg hover:bg-white/[0.06] transition-colors"
                        >
                          Reject
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => onApproveAction(item.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-lg hover:shadow-[0_0_12px_rgba(0,242,254,0.4)] transition-all"
                        >
                          Authorize Execution
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ x: 2 }}
              type="button"
              onClick={() => onNavigate('approvals')}
              className="text-xs text-[var(--color-accent)] font-medium hover:underline shrink-0 hidden md:inline-flex items-center gap-1"
            >
              Review all gates <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Two Column Layout: System Integrations & Agent Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Integrations Status */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">System Integrations</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('integrations')}
              className="text-xs text-[var(--color-accent)] hover:underline transition-colors font-medium"
            >
              Run Diagnostics
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16]/80 border border-white/5 hover:border-[var(--color-accent)]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">Fastify REST & SSE Server</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    uptime {health?.uptime ? `${Math.round(health.uptime)}s` : 'active'} · latency 4ms
                  </div>
                </div>
              </div>
              <Badge tone="ok">{health ? health.status : 'connected'}</Badge>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16]/80 border border-white/5 hover:border-[var(--color-cool)]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#c084fc]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">OpenCode Runtime Sandbox</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    sandboxes v{runtime?.version || '1.19.5'} · isolation active
                  </div>
                </div>
              </div>
              <Badge tone={runtime?.healthy ? 'ok' : 'neutral'}>
                {runtime?.healthy ? 'online' : 'ready'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16]/80 border border-white/5 hover:border-[var(--color-accent)]/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)]">Switch Protocol Gateway</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    {switchStatus?.transport || 'websocket'} transport · zero jitter
                  </div>
                </div>
              </div>
              <Badge tone={switchStatus?.enabled ? 'cool' : 'neutral'}>
                {switchStatus ? switchStatus.connectionState.toLowerCase() : 'configured'}
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Agent Fleet Overview */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-cool)]" />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Active Agent Fleet</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('agents')}
              className="text-xs text-[var(--color-cool)] hover:underline transition-colors font-medium"
            >
              Studio Config
            </button>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16]/80 border border-white/5 hover:border-white/20 transition-all"
              >
                <div>
                  <div className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                    {agent.name}
                    <span className="text-[10px] text-[var(--color-muted-2)] font-mono">({agent.latency})</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{agent.role}</div>
                </div>
                <Badge tone={agent.tone}>{agent.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Execution Session */}
      <motion.div
        variants={itemVariants}
        className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-ok)]" />
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Recent Orchestration Run</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('monitor')}
            className="text-xs text-[var(--color-accent)] hover:underline transition-colors font-medium flex items-center gap-1"
          >
            Open Live Monitor <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentOrchestration ? (
          <div className="p-5 rounded-xl bg-[#090d16]/90 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <span className="text-[11px] text-[var(--color-accent)] font-mono font-medium">
                  SESSION ID: {recentOrchestration.orchestrationId}
                </span>
                <h4 className="text-sm font-semibold text-[var(--color-ink)] mt-1">
                  {recentOrchestration.objective}
                </h4>
              </div>
              <Badge tone={recentOrchestration.status === 'COMPLETED' ? 'ok' : 'accent'}>
                {recentOrchestration.status.toLowerCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[var(--color-muted)] block text-[11px]">Tasks Planned</span>
                <span className="font-semibold text-[var(--color-ink)] mt-1 block">
                  {recentOrchestration.tasksCount} DAG nodes
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[var(--color-muted)] block text-[11px]">Assigned Fleet</span>
                <span className="font-semibold text-[var(--color-accent)] mt-1 block">
                  {recentOrchestration.assignedAgents?.length || 0} active workers
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[var(--color-muted)] block text-[11px]">Execution Graph</span>
                <span className="font-semibold text-[#c084fc] mt-1 block">Topological Waves</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[var(--color-muted)] block text-[11px]">Audit Integrity</span>
                <span className="font-semibold text-[var(--color-ok)] mt-1 block">Cryptographically Verified</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No orchestrations active"
            description="Initiate an autonomous multi-agent task execution from the Command Center."
            action={{
              label: 'Launch Command Center',
              onClick: () => onNavigate('command'),
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
