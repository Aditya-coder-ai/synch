import {
  Users2,
  ShieldAlert,
  Database,
  ArrowRight,
  Server,
  Radio,
  Cpu,
  Layers,
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
    { name: 'Coordinator', role: 'Topological planner & task dispatcher', status: 'idle', tone: 'cool' as const },
    { name: 'Developer', role: 'Runtime command execution & code synthesis', status: 'ready', tone: 'accent' as const },
    { name: 'QA & Test Runner', role: 'Automated test suite & regression validator', status: 'ready', tone: 'neutral' as const },
    { name: 'Reviewer', role: 'Security policies & human approval auditor', status: 'governing', tone: 'ok' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Greeting */}
      <div className="p-6 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-[var(--color-muted)] font-mono">workspace / proj-default</span>
          <h2 className="text-xl font-medium text-[var(--color-ink)] mt-1">
            Welcome back, Operator Admin
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xl">
            CrewFlow autonomous cluster is active. Multi-agent orchestration, OpenCode sandboxes, and L0 to L4 risk governance are online.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('command')}
            className="px-3 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            New task
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active agents"
          value={4}
          subtext="fleet operational"
          icon={Users2}
          tone="cool"
          onClick={() => onNavigate('agents')}
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals.length}
          subtext={pendingApprovals.length > 0 ? 'requires sign-off' : 'queue clear'}
          icon={ShieldAlert}
          tone={pendingApprovals.length > 0 ? 'bad' : 'ok'}
          onClick={() => onNavigate('approvals')}
        />
        <StatCard
          label="Shared memories"
          value={memories.length}
          subtext="project context"
          icon={Database}
          tone="default"
          onClick={() => onNavigate('memory')}
        />
        <StatCard
          label="Session tasks"
          value={totalTasks}
          subtext={recentOrchestration ? recentOrchestration.status.toLowerCase() : 'standby'}
          icon={Layers}
          tone="accent"
          onClick={() => onNavigate('command')}
        />
      </div>

      {/* Pending Approvals Urgent Alert */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 bg-[var(--color-bad-soft)] border border-[var(--color-bad)] rounded-[var(--radius-card)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[var(--color-bad)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-[var(--color-ink)]">
                  {pendingApprovals.length} sensitive operation{pendingApprovals.length > 1 ? 's' : ''} blocked awaiting human authorization
                </h3>
                <p className="text-xs text-[var(--color-ink-2)] mt-0.5">
                  Autonomous agents have paused execution at security boundaries. Review and authorize before runtime execution.
                </p>
                <div className="mt-3 space-y-2">
                  {pendingApprovals.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]"
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone="bad">{item.riskLevel}</Badge>
                        <span className="text-xs font-mono text-[var(--color-ink)] truncate max-w-md">
                          {item.description || item.actionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRejectAction(item.id)}
                          className="px-2.5 py-1 text-xs border border-[var(--color-rule)] text-[var(--color-ink-2)] rounded-[var(--radius-pill)] hover:bg-[var(--color-paper-3)]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveAction(item.id)}
                          className="px-2.5 py-1 text-xs bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-medium rounded-[var(--radius-pill)] hover:opacity-90"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('approvals')}
              className="text-xs text-[var(--color-accent)] hover:underline shrink-0 hidden md:inline"
            >
              View all
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: System Integrations & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Integrations Status */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--color-ink)]">System integrations</h3>
            <button
              type="button"
              onClick={() => onNavigate('integrations')}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              Diagnostics
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-[var(--color-muted)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">Fastify REST & SSE API</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    uptime {health?.uptime ? `${Math.round(health.uptime)}s` : 'active'}
                  </div>
                </div>
              </div>
              <Badge tone="ok">{health ? health.status : 'connected'}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]">
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-[var(--color-muted)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">OpenCode Runtime Server</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    sandbox workspaces v{runtime?.version || '1.19.5'}
                  </div>
                </div>
              </div>
              <Badge tone={runtime?.healthy ? 'ok' : 'neutral'}>
                {runtime?.healthy ? 'online' : 'ready'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]">
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-[var(--color-muted)]" />
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">Switch Agent Protocol</div>
                  <div className="text-[11px] text-[var(--color-muted)] font-mono">
                    {switchStatus?.transport || 'websocket'} transport
                  </div>
                </div>
              </div>
              <Badge tone={switchStatus?.enabled ? 'cool' : 'neutral'}>
                {switchStatus ? switchStatus.connectionState.toLowerCase() : 'configured'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Agent Fleet Overview */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--color-ink)]">Agent fleet</h3>
            <button
              type="button"
              onClick={() => onNavigate('agents')}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              Manage studio
            </button>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]"
              >
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">{agent.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)]">{agent.role}</div>
                </div>
                <Badge tone={agent.tone}>{agent.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Execution Session */}
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--color-ink)]">Recent orchestration</h3>
          <button
            type="button"
            onClick={() => onNavigate('monitor')}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            Live monitor
          </button>
        </div>

        {recentOrchestration ? (
          <div className="p-4 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-rule)]">
              <div>
                <span className="text-[11px] text-[var(--color-muted)] font-mono">
                  id: {recentOrchestration.orchestrationId}
                </span>
                <h4 className="text-sm font-medium text-[var(--color-ink)] mt-0.5">
                  {recentOrchestration.objective}
                </h4>
              </div>
              <Badge tone={recentOrchestration.status === 'COMPLETED' ? 'ok' : 'accent'}>
                {recentOrchestration.status.toLowerCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[var(--color-muted)] block">Tasks</span>
                <span className="font-mono text-[var(--color-ink)]">{recentOrchestration.tasksCount} planned</span>
              </div>
              <div>
                <span className="text-[var(--color-muted)] block">Assigned agents</span>
                <span className="font-mono text-[var(--color-ink)]">
                  {recentOrchestration.assignedAgents?.length || 0} active
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)] block">Execution mode</span>
                <span className="font-mono text-[var(--color-ink)]">topological DAG</span>
              </div>
              <div>
                <span className="text-[var(--color-muted)] block">Status</span>
                <span className="font-mono text-[var(--color-ok)]">verified</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('command')}
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
              >
                Inspect session details
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No orchestrations run yet"
            description="Initiate an autonomous multi-agent task run from the Command Center."
            action={{
              label: 'Open Command Center',
              onClick: () => onNavigate('command'),
            }}
          />
        )}
      </div>
    </div>
  );
}
