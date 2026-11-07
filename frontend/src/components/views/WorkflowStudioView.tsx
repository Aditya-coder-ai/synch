import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Workflow,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  wavesCount: number;
  stepsCount: number;
  suggestedObjective: string;
  waves: Array<{
    name: string;
    type: 'sequential' | 'parallel';
    steps: Array<{
      id: string;
      title: string;
      agentRole: string;
      actionType: string;
      riskLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
    }>;
  }>;
}

const templates: WorkflowTemplate[] = [
  {
    id: 'tpl-feature',
    name: 'Full-Stack Feature Rollout',
    description: 'Decompose specification, generate database migration, implement backend API, run tests, and gate deployment.',
    wavesCount: 4,
    stepsCount: 6,
    suggestedObjective: 'Build and deploy user authentication system with JWT and PostgreSQL audit logs',
    waves: [
      {
        name: 'Wave 1: Planning & Scope Definition',
        type: 'sequential',
        steps: [
          { id: 's1', title: 'Parse specifications & schema models', agentRole: 'COORDINATOR', actionType: 'FILE_READ', riskLevel: 'L0' },
          { id: 's2', title: 'Generate Prisma migration SQL script', agentRole: 'DEVELOPER', actionType: 'DATABASE_MIGRATION', riskLevel: 'L3' },
        ],
      },
      {
        name: 'Wave 2: Parallel Implementation & Testing',
        type: 'parallel',
        steps: [
          { id: 's3', title: 'Synthesize Fastify route handlers & Zod schemas', agentRole: 'DEVELOPER', actionType: 'FILE_CREATE', riskLevel: 'L1' },
          { id: 's4', title: 'Execute Vitest automated regression test suite', agentRole: 'QA_ENGINEER', actionType: 'TEST_EXECUTE', riskLevel: 'L1' },
        ],
      },
      {
        name: 'Wave 3: Governance & Security Audit',
        type: 'sequential',
        steps: [
          { id: 's5', title: 'Audit L0-L4 security bounds & hash digest', agentRole: 'REVIEWER', actionType: 'APPROVAL_REQUEST', riskLevel: 'L3' },
        ],
      },
      {
        name: 'Wave 4: Container Build & Deploy',
        type: 'sequential',
        steps: [
          { id: 's6', title: 'Build production image & push registry', agentRole: 'DEVELOPER', actionType: 'DEPLOYMENT', riskLevel: 'L4' },
        ],
      },
    ],
  },
  {
    id: 'tpl-audit',
    name: 'Security Audit & Threat Model',
    description: 'Autonomous vulnerability scanning, path-traversal prevention, and permission policy verification.',
    wavesCount: 3,
    stepsCount: 4,
    suggestedObjective: 'Perform complete L0-L4 permission audit across all workspace modules and OpenCode tools',
    waves: [
      {
        name: 'Wave 1: Surface Discovery',
        type: 'sequential',
        steps: [
          { id: 'a1', title: 'Catalog workspace routes & controller boundaries', agentRole: 'COORDINATOR', actionType: 'FILE_READ', riskLevel: 'L0' },
        ],
      },
      {
        name: 'Wave 2: Policy Verification & Fuzzing',
        type: 'parallel',
        steps: [
          { id: 'a2', title: 'Evaluate path-traversal & sandbox protections', agentRole: 'REVIEWER', actionType: 'TEST_EXECUTE', riskLevel: 'L1' },
          { id: 'a3', title: 'Verify default-deny action classification matrix', agentRole: 'REVIEWER', actionType: 'FILE_READ', riskLevel: 'L0' },
        ],
      },
      {
        name: 'Wave 3: Cryptographic Report Signing',
        type: 'sequential',
        steps: [
          { id: 'a4', title: 'Commit signed audit report to shared project memory', agentRole: 'REVIEWER', actionType: 'GIT_COMMIT', riskLevel: 'L2' },
        ],
      },
    ],
  },
];

interface WorkflowStudioViewProps {
  onSelectTemplateObjective: (objective: string) => void;
}

export function WorkflowStudioView({ onSelectTemplateObjective }: WorkflowStudioViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate>(templates[0]);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');

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
              Workflow Orchestration Studio
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Compose and inspect topological execution graphs, sequential/parallel execution waves, and human governance gates.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => onSelectTemplateObjective(selectedTemplate.suggestedObjective)}
          className="px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-[var(--color-accent)] to-[#38bdf8] text-black rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          Load Into Command Center
        </motion.button>
      </motion.div>

      {/* Template Selector Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => {
          const isSelected = selectedTemplate.id === tpl.id;
          return (
            <motion.button
              key={tpl.id}
              whileHover={{ y: -2 }}
              type="button"
              onClick={() => setSelectedTemplate(tpl)}
              className={`p-5 text-left rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-gradient-to-b from-[#0e1424]/95 to-[#090d16]/95 border-[var(--color-accent)] shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,242,254,0.15)]'
                  : 'bg-[#0e1424]/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-[var(--color-accent)]" />
                  {tpl.name}
                </h4>
                <Badge tone={isSelected ? 'accent' : 'neutral'}>
                  {tpl.stepsCount} STEPS · {tpl.wavesCount} WAVES
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-2 leading-relaxed">
                {tpl.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Visual Workflow Canvas / Graph */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-b from-[#0e1424]/90 to-[#090d16]/90 backdrop-blur-2xl border border-white/10 shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#090d16]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                {selectedTemplate.name}
              </h3>
              <span className="text-xs text-[var(--color-muted)] font-mono">
                Topological DAG: {selectedTemplate.wavesCount} waves · {selectedTemplate.stepsCount} execution nodes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#090d16] rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'visual'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/30 shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              Visual Waves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'json'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold border border-[var(--color-accent)]/30 shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              DAG JSON Schema
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'visual' ? (
            <div className="space-y-6">
              {selectedTemplate.waves.map((wave, wIdx) => (
                <div key={wave.name} className="relative">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                    <span className="text-xs font-mono font-bold text-[var(--color-accent)] tracking-wide uppercase">
                      {wave.name}
                    </span>
                    <Badge tone={wave.type === 'parallel' ? 'cool' : 'neutral'}>
                      {wave.type.toUpperCase()} EXECUTION
                    </Badge>
                  </div>

                  <div className={`grid gap-3.5 ${wave.type === 'parallel' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    {wave.steps.map((step) => {
                      const isGate = step.riskLevel === 'L3' || step.riskLevel === 'L4';
                      return (
                        <motion.div
                          key={step.id}
                          whileHover={{ y: -2 }}
                          className={`p-4 rounded-xl border transition-all ${
                            isGate
                              ? 'border-[#f43f5e]/40 bg-gradient-to-r from-[#f43f5e]/10 to-[#0e1424]/80 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                              : 'border-white/10 bg-[#090d16]/80 hover:border-[var(--color-accent)]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono font-bold text-[var(--color-muted)]">{step.id}</span>
                            <div className="flex items-center gap-2">
                              <Badge tone="cool">{step.agentRole}</Badge>
                              <Badge tone={isGate ? 'bad' : 'neutral'}>
                                {step.riskLevel}
                              </Badge>
                            </div>
                          </div>

                          <h5 className="text-xs font-semibold text-[var(--color-ink)] leading-snug">{step.title}</h5>

                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)]">
                            <span>Operation: {step.actionType}</span>
                            {isGate ? (
                              <span className="text-[#fb7185] flex items-center gap-1 font-semibold">
                                <Lock className="w-3.5 h-3.5" /> HUMAN APPROVAL GATE
                              </span>
                            ) : (
                              <span className="text-[var(--color-ok)] font-medium">AUTONOMOUS</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {wIdx < selectedTemplate.waves.length - 1 && (
                    <div className="flex justify-center my-4">
                      <div className="w-[2px] h-8 bg-gradient-to-b from-[var(--color-accent)] to-transparent" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <pre className="p-5 bg-[#060911] border border-white/10 rounded-xl font-mono text-xs text-[var(--color-ink-2)] overflow-x-auto max-h-96">
              {JSON.stringify(selectedTemplate, null, 2)}
            </pre>
          )}
        </div>
      </motion.div>
    </div>
  );
}
