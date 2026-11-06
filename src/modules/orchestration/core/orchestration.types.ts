import type { OrchestrationStatus, AgentRole, TaskPriority } from '../../../database/types.js';

export interface PlannedTaskDefinition {
  tempId: string;
  title: string;
  description: string;
  expectedOutcome: string;
  requiredCapabilities: string[];
  suggestedRole: AgentRole;
  priority: TaskPriority;
  dependencies: string[]; // references tempIds of prerequisite tasks
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  completionCriteria: string[];
}

export interface StructuredExecutionPlan {
  planId: string;
  objective: string;
  summary: string;
  tasks: PlannedTaskDefinition[];
  dependencyGraph: Record<string, string[]>; // tempId -> list of prerequisite tempIds
  estimatedTotalComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
}

export interface OrchestrationRequestInput {
  projectId: string;
  objective: string;
  initiatorUserId?: string | null;
  conversationId?: string | null;
  context?: Record<string, unknown>;
  autoExecute?: boolean; // if true, runs scheduler and dispatch loop; if false, only plans
}

export interface AgentAssignmentResult {
  taskId: string;
  agentId: string;
  agentName: string;
  role: AgentRole;
  matchScore: number;
  reason: string;
}

export interface TaskSchedulingResult {
  scheduledTaskIds: string[];
  blockedTaskIds: string[];
  completedTaskIds: string[];
  failedTaskIds: string[];
  inProgressTaskIds: string[];
}

export interface OrchestrationExecutionSummary {
  orchestrationId: string;
  projectId: string;
  status: OrchestrationStatus;
  objective: string;
  plan: StructuredExecutionPlan;
  persistedTaskIds: string[];
  assignments: AgentAssignmentResult[];
  scheduling: TaskSchedulingResult;
  startedAt: string | null;
  completedAt: string | null;
  durationMs?: number;
  error?: string | null;
}
