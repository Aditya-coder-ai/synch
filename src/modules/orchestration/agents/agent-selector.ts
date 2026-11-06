import { AgentStatus } from '../../../database/types.js';
import type {
  AgentCandidate,
  AgentEvaluation,
  AgentSelectionExplanation,
  AgentSelectionQuery,
} from './agent.types.js';
import { CapabilityRegistry } from './agent-capabilities.js';

export class AgentSelector {
  /**
   * Evaluates all candidates and selects the best matching agent for a task.
   */
  public selectAgent(
    candidates: AgentCandidate[],
    query: AgentSelectionQuery,
  ): AgentSelectionExplanation {
    const evaluations: AgentEvaluation[] = [];

    for (const agent of candidates) {
      // 1. Cross-Project Check
      if (agent.projectId !== query.projectId) {
        evaluations.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          status: agent.status,
          eligible: false,
          score: 0,
          matchedCapabilities: [],
          missingCapabilities: query.requiredCapabilities,
          rejectionReason: `Agent belongs to a different project '${agent.projectId}' (target: '${query.projectId}')`,
          selectionReasons: [],
        });
        continue;
      }

      // 2. Status Eligibility Check: Strict rejection of OFFLINE, PAUSED, ERROR
      if (
        agent.status === AgentStatus.OFFLINE ||
        agent.status === AgentStatus.PAUSED ||
        agent.status === AgentStatus.ERROR
      ) {
        evaluations.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          status: agent.status,
          eligible: false,
          score: 0,
          matchedCapabilities: [],
          missingCapabilities: query.requiredCapabilities,
          rejectionReason: `Agent status is '${agent.status}', unavailable for task assignment`,
          selectionReasons: [],
        });
        continue;
      }

      // 3. Busy status check (reject unless allowBusy policy is true)
      if (agent.status === AgentStatus.BUSY && !query.allowBusy) {
        evaluations.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          status: agent.status,
          eligible: false,
          score: 0,
          matchedCapabilities: [],
          missingCapabilities: query.requiredCapabilities,
          rejectionReason: `Agent is currently BUSY and policy prohibits concurrent assignment`,
          selectionReasons: [],
        });
        continue;
      }

      // 4. Capability Match Evaluation
      const match = CapabilityRegistry.evaluateMatch(
        agent.capabilities,
        query.requiredCapabilities,
      );

      // Require at least partial match (or 100% if no requirements specified)
      if (query.requiredCapabilities.length > 0 && match.matched.length === 0) {
        evaluations.push({
          agentId: agent.id,
          agentName: agent.name,
          role: agent.role,
          status: agent.status,
          eligible: false,
          score: 0,
          matchedCapabilities: [],
          missingCapabilities: match.missing,
          rejectionReason: `Agent lacks required capabilities: ${match.missing.join(', ')}`,
          selectionReasons: [],
        });
        continue;
      }

      // 5. Scoring calculation (Scale: 0 - 100)
      // Capabilities: up to 70 points
      const capabilityPoints = Math.round((match.matchPercentage / 100) * 70);
      let score = capabilityPoints;

      const selectionReasons: string[] = [
        `Matched ${match.matched.length}/${query.requiredCapabilities.length} required capabilities (${match.matchPercentage}%, ${capabilityPoints}/70 pts)`,
      ];

      // Role alignment bonus
      if (query.preferredRole && agent.role === query.preferredRole) {
        score += 20;
        selectionReasons.push(`Role perfectly aligns with suggested role '${query.preferredRole}' (+20 bonus)`);
      } else if (query.preferredRole) {
        selectionReasons.push(`Role '${agent.role}' differs from suggested role '${query.preferredRole}'`);
      }

      // Workload penalty (slight penalty per active task to balance load)
      const workloadPenalty = Math.min(agent.activeWorkload * 5, 25);
      if (workloadPenalty > 0) {
        score -= workloadPenalty;
        selectionReasons.push(`Current active workload is ${agent.activeWorkload} tasks (-${workloadPenalty} load penalty)`);
      } else {
        selectionReasons.push('Agent has zero active workload');
      }

      // Status bonus for ACTIVE or IDLE
      if (agent.status === AgentStatus.IDLE) {
        score += 10;
        selectionReasons.push('Agent is currently IDLE (+10 availability bonus)');
      } else if (agent.status === AgentStatus.ACTIVE) {
        score += 5;
        selectionReasons.push('Agent is currently ACTIVE');
      }

      evaluations.push({
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        status: agent.status,
        eligible: true,
        score: Math.max(0, Math.min(100, score)),
        matchedCapabilities: match.matched,
        missingCapabilities: match.missing,
        selectionReasons,
      });
    }

    // Filter eligible candidates and sort by score descending, then activeWorkload ascending
    const eligible = evaluations.filter(e => e.eligible);
    eligible.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const agentA = candidates.find(c => c.id === a.agentId);
      const agentB = candidates.find(c => c.id === b.agentId);
      return (agentA?.activeWorkload ?? 0) - (agentB?.activeWorkload ?? 0);
    });

    if (eligible.length === 0) {
      return {
        selectedAgentId: null,
        selectedAgentName: null,
        selectedRole: null,
        confidenceScore: 0,
        matchedCapabilities: [],
        evaluations,
        summary: `No suitable agent available in project '${query.projectId}'. All candidates rejected due to status, missing capabilities, or workload.`,
      };
    }

    const winner = eligible[0]!;
    const winnerCandidate = candidates.find(c => c.id === winner.agentId)!;

    return {
      selectedAgentId: winner.agentId,
      selectedAgentName: winner.agentName,
      selectedRole: winnerCandidate.role,
      confidenceScore: winner.score,
      matchedCapabilities: winner.matchedCapabilities,
      evaluations,
      summary: `Selected agent '${winner.agentName}' (${winnerCandidate.role}) with score ${winner.score}/100. ${winner.selectionReasons.join('. ')}.`,
    };
  }
}
