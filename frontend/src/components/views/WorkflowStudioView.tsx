import { useState } from 'react';
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
        name: 'Wave 1: Planning & Scope',
        type: 'sequential',
        steps: [
          { id: 's1', title: 'Parse requirements and schema models', agentRole: 'COORDINATOR', actionType: 'FILE_READ', riskLevel: 'L0' },
          { id: 's2', title: 'Generate Prisma migration SQL', agentRole: 'DEVELOPER', actionType: 'DATABASE_MIGRATION', riskLevel: 'L3' },
        ],
      },
      {
        name: 'Wave 2: Parallel Implementation & Testing',
        type: 'parallel',
        steps: [
          { id: 's3', title: 'Synthesize Fastify route handlers & Zod schemas', agentRole: 'DEVELOPER', actionType: 'FILE_CREATE', riskLevel: 'L1' },
          { id: 's4', title: 'Generate and execute Vitest regression test suite', agentRole: 'QA_ENGINEER', actionType: 'TEST_EXECUTE', riskLevel: 'L1' },
        ],
      },
      {
        name: 'Wave 3: Governance & Security Audit',
        type: 'sequential',
        steps: [
          { id: 's5', title: 'Audit L0 to L4 security bounds and hash payload', agentRole: 'REVIEWER', actionType: 'APPROVAL_REQUEST', riskLevel: 'L3' },
        ],
      },
      {
        name: 'Wave 4: Deployment',
        type: 'sequential',
        steps: [
          { id: 's6', title: 'Deploy container image to production registry', agentRole: 'DEVELOPER', actionType: 'DEPLOYMENT', riskLevel: 'L4' },
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
        name: 'Wave 1: Discovery',
        type: 'sequential',
        steps: [
          { id: 'a1', title: 'Catalog workspace routes and controller boundaries', agentRole: 'COORDINATOR', actionType: 'FILE_READ', riskLevel: 'L0' },
        ],
      },
      {
        name: 'Wave 2: Policy Verification',
        type: 'parallel',
        steps: [
          { id: 'a2', title: 'Evaluate path-traversal and boundary protections', agentRole: 'REVIEWER', actionType: 'TEST_EXECUTE', riskLevel: 'L1' },
          { id: 'a3', title: 'Verify default-deny action classification matrix', agentRole: 'REVIEWER', actionType: 'FILE_READ', riskLevel: 'L0' },
        ],
      },
      {
        name: 'Wave 3: Report & Persistence',
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
      <div className="p-5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-[var(--color-ink)]">Workflow Studio</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Compose and inspect multi-agent execution graphs, sequential/parallel execution waves, and human governance gates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectTemplateObjective(selectedTemplate.suggestedObjective)}
          className="px-3 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-pill)] hover:opacity-90 transition-opacity flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          Load in Command Center
        </button>
      </div>

      {/* Template Selector Row */}
      <div className="flex flex-wrap gap-3">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setSelectedTemplate(tpl)}
            className={`p-3 text-left rounded-[var(--radius-card)] border transition-colors flex-1 min-w-[240px] ${
              selectedTemplate.id === tpl.id
                ? 'bg-[var(--color-paper-2)] border-[var(--color-accent)]'
                : 'bg-[var(--color-paper)] border-[var(--color-rule)] hover:border-[var(--color-rule-2)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-[var(--color-ink)]">{tpl.name}</h4>
              <Badge tone={selectedTemplate.id === tpl.id ? 'accent' : 'neutral'}>
                {tpl.stepsCount} steps
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--color-muted)] mt-1 line-clamp-2">
              {tpl.description}
            </p>
          </button>
        ))}
      </div>

      {/* Visual Workflow Canvas / Graph */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-rule)]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-medium text-[var(--color-ink)]">
              {selectedTemplate.name}
            </h3>
            <span className="text-xs text-[var(--color-muted)] font-mono">
              ({selectedTemplate.wavesCount} waves · {selectedTemplate.stepsCount} total steps)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 py-1 text-xs rounded-[var(--radius-pill)] border ${
                activeTab === 'visual'
                  ? 'bg-[var(--color-paper-3)] border-[var(--color-rule-2)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)]'
              }`}
            >
              Visual waves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-1 text-xs rounded-[var(--radius-pill)] border ${
                activeTab === 'json'
                  ? 'bg-[var(--color-paper-3)] border-[var(--color-rule-2)] text-[var(--color-ink)]'
                  : 'border-transparent text-[var(--color-muted)]'
              }`}
            >
              DAG schema
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'visual' ? (
            <div className="space-y-6">
              {selectedTemplate.waves.map((wave, wIdx) => (
                <div key={wave.name} className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono font-medium text-[var(--color-accent)]">
                      {wave.name}
                    </span>
                    <Badge tone={wave.type === 'parallel' ? 'cool' : 'neutral'}>
                      {wave.type}
                    </Badge>
                  </div>

                  <div className={`grid gap-3 ${wave.type === 'parallel' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    {wave.steps.map((step) => {
                      const isGate = step.riskLevel === 'L3' || step.riskLevel === 'L4';
                      return (
                        <div
                          key={step.id}
                          className={`p-3.5 bg-[var(--color-paper)] border rounded-[var(--radius-card)] transition-colors ${
                            isGate
                              ? 'border-[var(--color-bad)]/60 bg-[var(--color-bad-soft)]/20'
                              : 'border-[var(--color-rule)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono text-[var(--color-muted)]">{step.id}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge tone="cool">{step.agentRole}</Badge>
                              <Badge tone={isGate ? 'bad' : 'neutral'}>
                                {step.riskLevel}
                              </Badge>
                            </div>
                          </div>

                          <h5 className="text-xs font-medium text-[var(--color-ink)]">{step.title}</h5>

                          <div className="mt-3 pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] font-mono text-[var(--color-muted)]">
                            <span>Op: {step.actionType}</span>
                            {isGate ? (
                              <span className="text-[var(--color-bad)] flex items-center gap-1">
                                <Lock className="w-3 h-3" /> human gate
                              </span>
                            ) : (
                              <span className="text-[var(--color-ok)]">autonomous</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {wIdx < selectedTemplate.waves.length - 1 && (
                    <div className="flex justify-center my-3">
                      <div className="w-0.5 h-6 bg-[var(--color-rule)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <pre className="p-4 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] font-mono text-xs text-[var(--color-ink-2)] overflow-x-auto max-h-96">
              {JSON.stringify(selectedTemplate, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
