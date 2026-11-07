import { useState } from 'react';
import {
  Users2,
  Play,
  Pause,
  Square,
  Plus,
  ShieldCheck,
  Cpu,
  Settings2,
  Check,
  X,
  Wrench,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  status: 'RUNNING' | 'IDLE' | 'PAUSED' | 'FAILED';
  capabilities: string[];
  toolPermissions: string[];
  maxRiskLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
}

const defaultAgents: AgentConfig[] = [
  {
    id: 'agent-coordinator',
    name: 'Coordinator Agent',
    role: 'COORDINATOR',
    description: 'Decomposes high-level objectives into dependency-ordered DAGs and allocates workers.',
    status: 'IDLE',
    capabilities: ['TOPOLOGICAL_PLANNING', 'TASK_DECOMPOSITION', 'AGENT_DISPATCH'],
    toolPermissions: ['FILE_READ', 'MEMORY_QUERY', 'ORCHESTRATION_DISPATCH'],
    maxRiskLevel: 'L2',
  },
  {
    id: 'agent-developer',
    name: 'Developer Agent',
    role: 'DEVELOPER',
    description: 'Executes runtime code synthesis, sandbox file modification, and shell commands.',
    status: 'RUNNING',
    capabilities: ['CODE_GENERATION', 'RUNTIME_EXECUTION', 'WORKSPACE_MODIFICATION'],
    toolPermissions: ['FILE_READ', 'FILE_CREATE', 'FILE_MODIFY', 'COMMAND_EXECUTE', 'GIT_COMMIT'],
    maxRiskLevel: 'L3',
  },
  {
    id: 'agent-qa',
    name: 'QA & Test Runner',
    role: 'QA_ENGINEER',
    description: 'Executes automated test suites, validates runtime regressions, and reports diffs.',
    status: 'IDLE',
    capabilities: ['TEST_EXECUTION', 'COVERAGE_ANALYSIS', 'RUNTIME_VERIFICATION'],
    toolPermissions: ['FILE_READ', 'TEST_EXECUTE', 'COMMAND_EXECUTE'],
    maxRiskLevel: 'L1',
  },
  {
    id: 'agent-reviewer',
    name: 'Security Reviewer',
    role: 'REVIEWER',
    description: 'Evaluates L0 to L4 policy bounds, audits operations, and triggers approval gates.',
    status: 'RUNNING',
    capabilities: ['POLICY_ENFORCEMENT', 'SECURITY_AUDITING', 'APPROVAL_INTERCEPTION'],
    toolPermissions: ['FILE_READ', 'DATABASE_READ', 'APPROVAL_REQUEST', 'AUDIT_RECORD'],
    maxRiskLevel: 'L4',
  },
];

export function AgentStudioView() {
  const [agents, setAgents] = useState<AgentConfig[]>(defaultAgents);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(defaultAgents[0]);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // New agent form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('SPECIALIST');
  const [newDescription, setNewDescription] = useState('');
  const [newRisk, setNewRisk] = useState<'L0' | 'L1' | 'L2' | 'L3' | 'L4'>('L2');

  const handleStatusChange = (id: string, newStatus: AgentConfig['status']) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    if (selectedAgent && selectedAgent.id === id) {
      setSelectedAgent((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newAgent: AgentConfig = {
      id: `agent-custom-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      description: newDescription.trim() || 'Custom autonomous agent configured for workspace tasks.',
      status: 'IDLE',
      capabilities: ['CUSTOM_EXECUTION', 'WORKSPACE_ANALYSIS'],
      toolPermissions: ['FILE_READ', 'COMMAND_EXECUTE'],
      maxRiskLevel: newRisk,
    };

    setAgents((prev) => [...prev, newAgent]);
    setSelectedAgent(newAgent);
    setIsConfiguring(false);
    setNewName('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Agent Studio</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Configure agent fleet roles, runtime tool permissions, and autonomy risk boundaries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsConfiguring(true)}
          className="px-3 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add agent
        </button>
      </div>

      {/* Creation Modal / Drawer */}
      {isConfiguring && (
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-accent)] rounded-[var(--radius-card)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Register new autonomous agent</h3>
            <button
              type="button"
              onClick={() => setIsConfiguring(false)}
              className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--color-muted)] block mb-1">Agent name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="E.g., DevOps Deployer"
                  className="w-full p-2 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted)] block mb-1">Role classification</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
                >
                  <option value="SPECIALIST">Specialist</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="QA_ENGINEER">QA Engineer</option>
                  <option value="DEVOPS">DevOps</option>
                  <option value="SECURITY">Security Auditor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--color-muted)] block mb-1">Description & role purpose</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="E.g., Specializes in container building, Dockerfile generation, and health probes."
                className="w-full p-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-[var(--color-ink)]"
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-[var(--color-muted)] block mb-1">Max allowable risk level</label>
                <div className="flex items-center gap-1.5">
                  {(['L0', 'L1', 'L2', 'L3', 'L4'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewRisk(lvl)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-[var(--radius-pill)] border ${
                        newRisk === lvl
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]'
                          : 'border-[var(--color-rule)] text-[var(--color-muted)]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                className="px-3 py-1.5 text-xs text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90"
              >
                Save agent
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents Grid and Selected Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet List */}
        <div className="lg:col-span-2 space-y-3">
          {agents.map((agent) => {
            const isSelected = selectedAgent?.id === agent.id;
            const statusTone =
              agent.status === 'RUNNING'
                ? 'accent'
                : agent.status === 'FAILED'
                ? 'bad'
                : agent.status === 'PAUSED'
                ? 'warning'
                : 'neutral';

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-4 bg-[var(--color-paper-2)] border rounded-[var(--radius-card)] cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-rule)] hover:border-[var(--color-rule-2)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-accent)]">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)]">{agent.name}</h4>
                      <span className="text-[11px] font-mono text-[var(--color-muted)]">
                        {agent.role} · Risk ceiling: {agent.maxRiskLevel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge tone={statusTone}>{agent.status.toLowerCase()}</Badge>

                    <div className="flex items-center gap-1 pl-2 border-l border-[var(--color-rule)]" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'RUNNING')}
                        disabled={agent.status === 'RUNNING'}
                        title="Start agent"
                        className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ok)] disabled:opacity-30"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'PAUSED')}
                        disabled={agent.status === 'PAUSED'}
                        title="Pause agent"
                        className="p-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] disabled:opacity-30"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'IDLE')}
                        disabled={agent.status === 'IDLE'}
                        title="Stop agent"
                        className="p-1 text-[var(--color-muted)] hover:text-[var(--color-bad)] disabled:opacity-30"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-ink-2)] mt-2">{agent.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 text-[10px] font-mono text-[var(--color-muted)] bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Agent Inspector Panel */}
        <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] h-fit space-y-4">
          {selectedAgent ? (
            <>
              <div className="pb-3 border-b border-[var(--color-rule)]">
                <span className="text-[11px] font-mono text-[var(--color-muted)]">agent inspector</span>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mt-0.5">
                  {selectedAgent.name}
                </h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">{selectedAgent.description}</p>
              </div>

              <div>
                <span className="text-xs font-medium text-[var(--color-ink)] block mb-2">
                  Tool permissions matrix
                </span>
                <div className="space-y-1.5">
                  {[
                    'FILE_READ',
                    'FILE_CREATE',
                    'FILE_MODIFY',
                    'FILE_DELETE',
                    'COMMAND_EXECUTE',
                    'TEST_EXECUTE',
                    'DATABASE_READ',
                    'GIT_COMMIT',
                  ].map((perm) => {
                    const isGranted = selectedAgent.toolPermissions.includes(perm);
                    return (
                      <div
                        key={perm}
                        className="flex items-center justify-between p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs font-mono"
                      >
                        <span className="text-[var(--color-ink-2)]">{perm}</span>
                        {isGranted ? (
                          <span className="text-[var(--color-ok)] flex items-center gap-1 text-[11px]">
                            <Check className="w-3 h-3" /> granted
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)] text-[11px]">denied</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-rule)]">
                <span className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Autonomy policy
                </span>
                <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs text-[var(--color-muted)]">
                  Actions with risk score above <strong className="text-[var(--color-accent)] font-mono">{selectedAgent.maxRiskLevel}</strong> will be intercepted and require human approval.
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] text-center py-8">
              Select an agent from the fleet to inspect its configuration and tool permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
