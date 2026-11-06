import type { AgentRole, AgentStatus } from '../../../database/types.js';

export interface AgentCandidate {
  id: string;
  projectId: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  capabilities: string[];
  configuration: Record<string, unknown>;
  activeWorkload: number; // number of tasks currently in TODO, IN_PROGRESS, or IN_REVIEW
}

export interface AgentEvaluation {
  agentId: string;
  agentName: string;
  role: AgentRole;
  status: AgentStatus;
  eligible: boolean;
  score: number; // 0 to 100
  matchedCapabilities: string[];
  missingCapabilities: string[];
  rejectionReason?: string;
  selectionReasons: string[];
}

export interface AgentSelectionQuery {
  projectId: string;
  requiredCapabilities: string[];
  preferredRole?: AgentRole;
  allowBusy?: boolean;
}

export interface AgentSelectionExplanation {
  selectedAgentId: string | null;
  selectedAgentName: string | null;
  selectedRole: AgentRole | null;
  confidenceScore: number;
  matchedCapabilities: string[];
  evaluations: AgentEvaluation[];
  summary: string;
}
