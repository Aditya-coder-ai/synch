import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Bot,
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0e1424]/95 via-[#141c32]/85 to-[#0e1424]/95 backdrop-blur-xl border border-[var(--color-rule-2)] shadow-xl"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-cool)] shadow-[0_0_8px_#a855f7]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
              Multi-Agent Fleet Studio
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Provision autonomous agent workers, customize runtime capabilities, and configure strict tool permission matrices.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsConfiguring(true)}
          className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-[var(--color-cool)] to-[#00f2fe] text-black rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Register New Agent
        </motion.button>
      </motion.div>

      {/* Creation Modal / Drawer */}
      <AnimatePresence>
        {isConfiguring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-2xl bg-[#0e1424] border border-[var(--color-accent)] shadow-[0_0_30px_rgba(0,242,254,0.15)] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--color-accent)]" />
                Configure New Autonomous Fleet Member
              </h3>
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                className="p-1 rounded-lg text-[var(--color-muted)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="E.g., DevOps Container Specialist"
                    className="w-full p-3 text-xs font-mono bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Role Type</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                  >
                    <option value="SPECIALIST">SPECIALIST</option>
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="QA_ENGINEER">QA_ENGINEER</option>
                    <option value="DEVOPS">DEVOPS</option>
                    <option value="SECURITY">SECURITY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Mission Profile & Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="E.g., Executes Docker container builds, linting, and health probe verifications."
                  className="w-full p-3 text-xs bg-[#090d16] border border-white/10 rounded-xl text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted)] font-mono block mb-1">Risk Ceiling Boundary</label>
                <div className="flex items-center gap-2">
                  {(['L0', 'L1', 'L2', 'L3', 'L4'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewRisk(lvl)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                        newRisk === lvl
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)] shadow-[0_0_10px_rgba(0,242,254,0.3)] font-bold'
                          : 'border-white/10 text-[var(--color-muted)] hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="px-4 py-2 text-xs text-[var(--color-muted)] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-xl hover:shadow-[0_0_14px_rgba(0,242,254,0.4)]"
                >
                  Save Agent Definition
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agents Grid and Selected Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet List */}
        <div className="lg:col-span-2 space-y-3.5">
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
              <motion.div
                key={agent.id}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                onClick={() => setSelectedAgent(agent)}
                className={`p-5 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[var(--color-accent)] shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,242,254,0.15)]'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[var(--color-accent)]">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)] tracking-tight">{agent.name}</h4>
                      <span className="text-[11px] font-mono text-[var(--color-muted)]">
                        {agent.role} · Risk Ceiling: {agent.maxRiskLevel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <Badge tone={statusTone}>{agent.status.toLowerCase()}</Badge>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-white/10" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'RUNNING')}
                        disabled={agent.status === 'RUNNING'}
                        title="Start agent"
                        className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ok)] hover:bg-[var(--color-ok-soft)] disabled:opacity-20 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'PAUSED')}
                        disabled={agent.status === 'PAUSED'}
                        title="Pause agent"
                        className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[#fbbf24] hover:bg-[#f59e0b]/20 disabled:opacity-20 transition-all"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleStatusChange(agent.id, 'IDLE')}
                        disabled={agent.status === 'IDLE'}
                        title="Stop agent"
                        className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[#fb7185] hover:bg-[#f43f5e]/20 disabled:opacity-20 transition-all"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-muted)] mt-2.5 leading-relaxed">{agent.description}</p>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2.5 py-1 text-[10px] font-mono text-[var(--color-accent)] bg-[var(--color-accent-soft)] rounded-lg border border-[var(--color-accent)]/20"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Agent Inspector Panel */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-xl border border-[var(--color-rule)] shadow-lg h-fit space-y-5">
          {selectedAgent ? (
            <>
              <div className="pb-4 border-b border-white/10">
                <span className="text-[11px] font-mono text-[var(--color-accent)] uppercase tracking-wider">
                  Inspector Telemetry
                </span>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mt-1 tracking-tight">
                  {selectedAgent.name}
                </h3>
                <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed">{selectedAgent.description}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-[var(--color-ink)] block mb-3 font-mono">
                  TOOL PERMISSIONS MATRIX
                </span>
                <div className="space-y-2">
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
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#090d16] border border-white/5 text-xs font-mono"
                      >
                        <span className="text-[var(--color-ink-2)]">{perm}</span>
                        {isGranted ? (
                          <span className="text-[var(--color-ok)] flex items-center gap-1 text-[11px] font-semibold">
                            <Check className="w-3.5 h-3.5" /> GRANTED
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted-2)] text-[11px]">DENIED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <span className="text-xs font-semibold text-[var(--color-ink)] block mb-1.5 font-mono">
                  SECURITY POLICY BOUNDARY
                </span>
                <div className="p-3 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--color-muted)] leading-relaxed">
                  Operations evaluated above risk level <strong className="text-[var(--color-accent)] font-mono">{selectedAgent.maxRiskLevel}</strong> will trigger a mandatory cryptographic human-in-the-loop gate.
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--color-muted)] text-center py-12">
              Select an agent from the fleet to inspect its configuration and security bounds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
