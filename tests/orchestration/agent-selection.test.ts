import { describe, it, expect } from 'vitest';
import { AgentSelector } from '../../src/modules/orchestration/agents/agent-selector.js';
import { CapabilityRegistry } from '../../src/modules/orchestration/agents/agent-capabilities.js';
import { AgentRole, AgentStatus } from '../../src/database/types.js';
import type { AgentCandidate } from '../../src/modules/orchestration/agents/agent.types.js';

describe('Agent Selection & Capability Matching', () => {
  const candidateDeveloperA: AgentCandidate = {
    id: 'agent_dev_01',
    projectId: 'proj_100',
    name: 'Primary Backend Developer',
    role: AgentRole.DEVELOPER,
    status: AgentStatus.IDLE,
    capabilities: ['code_implementation', 'code_refactoring', 'database_design', 'debugging'],
    configuration: {},
    activeWorkload: 0,
  };

  const candidateDeveloperB: AgentCandidate = {
    id: 'agent_dev_02',
    projectId: 'proj_100',
    name: 'Secondary Backend Developer',
    role: AgentRole.DEVELOPER,
    status: AgentStatus.BUSY,
    capabilities: ['code_implementation', 'code_refactoring', 'database_design', 'debugging'],
    configuration: {},
    activeWorkload: 3,
  };

  const candidateDeveloperOffline: AgentCandidate = {
    id: 'agent_dev_offline',
    projectId: 'proj_100',
    name: 'Offline Developer',
    role: AgentRole.DEVELOPER,
    status: AgentStatus.OFFLINE,
    capabilities: ['code_implementation'],
    configuration: {},
    activeWorkload: 0,
  };

  const candidateDeveloperError: AgentCandidate = {
    id: 'agent_dev_error',
    projectId: 'proj_100',
    name: 'Broken Developer',
    role: AgentRole.DEVELOPER,
    status: AgentStatus.ERROR,
    capabilities: ['code_implementation'],
    configuration: {},
    activeWorkload: 0,
  };

  const candidateQA: AgentCandidate = {
    id: 'agent_qa_01',
    projectId: 'proj_100',
    name: 'Quality Assurance Agent',
    role: AgentRole.QA,
    status: AgentStatus.IDLE,
    capabilities: ['unit_testing', 'regression_testing', 'test_analysis'],
    configuration: {},
    activeWorkload: 1,
  };

  const selector = new AgentSelector();

  it('should match an agent with the required role and capabilities', () => {
    const result = selector.selectAgent(
      [candidateDeveloperA, candidateQA],
      {
        projectId: 'proj_100',
        preferredRole: AgentRole.DEVELOPER,
        requiredCapabilities: ['code_implementation', 'debugging'],
      },
    );

    expect(result.selectedAgentId).toBe('agent_dev_01');
    expect(result.selectedAgentName).toBe('Primary Backend Developer');
    expect(result.selectedRole).toBe(AgentRole.DEVELOPER);
    expect(result.confidenceScore).toBeGreaterThan(80);

    const bestEval = result.evaluations.find(c => c.agentId === 'agent_dev_01');
    expect(bestEval?.matchedCapabilities).toContain('code_implementation');
    expect(bestEval?.matchedCapabilities).toContain('debugging');
  });

  it('should strictly exclude OFFLINE, PAUSED, and ERROR agents from eligibility', () => {
    const result = selector.selectAgent(
      [candidateDeveloperOffline, candidateDeveloperError],
      {
        projectId: 'proj_100',
        preferredRole: AgentRole.DEVELOPER,
        requiredCapabilities: ['code_implementation'],
      },
    );

    expect(result.selectedAgentId).toBeNull();
    for (const evaluated of result.evaluations) {
      expect(evaluated.eligible).toBe(false);
      expect(evaluated.score).toBe(0);
      expect(evaluated.rejectionReason).toContain('unavailable for task assignment');
    }
  });

  it('should apply workload penalty to prioritize lighter loaded agents when skills are identical', () => {
    // Both dev A and dev B have identical capabilities, but dev B has 3 active tasks while dev A has 0
    const result = selector.selectAgent(
      [candidateDeveloperB, candidateDeveloperA],
      {
        projectId: 'proj_100',
        preferredRole: AgentRole.DEVELOPER,
        requiredCapabilities: ['code_implementation'],
        allowBusy: true,
      },
    );

    expect(result.selectedAgentId).toBe('agent_dev_01');

    const evalA = result.evaluations.find(c => c.agentId === 'agent_dev_01')!;
    const evalB = result.evaluations.find(c => c.agentId === 'agent_dev_02')!;
    expect(evalA.score).toBeGreaterThan(evalB.score);
  });

  it('should return null selectedAgentId when no agents exist in candidate list', () => {
    const result = selector.selectAgent(
      [],
      {
        projectId: 'proj_empty',
        preferredRole: AgentRole.DEVELOPER,
        requiredCapabilities: ['code_implementation'],
      },
    );

    expect(result.selectedAgentId).toBeNull();
    expect(result.evaluations).toHaveLength(0);
  });

  it('should correctly normalize role capabilities using CapabilityRegistry', () => {
    const devCaps = CapabilityRegistry.normalizeCapabilities([], AgentRole.DEVELOPER);
    expect(devCaps).toContain('code_implementation');
    expect(devCaps).toContain('debugging');

    const qaCaps = CapabilityRegistry.normalizeCapabilities([], AgentRole.QA);
    expect(qaCaps).toContain('unit_testing');
    expect(qaCaps).toContain('regression_testing');

    const revCaps = CapabilityRegistry.normalizeCapabilities([], AgentRole.REVIEWER);
    expect(revCaps).toContain('code_review');
    expect(revCaps).toContain('security_review');
  });
});

