import type { ExecutionStatus } from '../../../database/types.js';

export interface AgentExecutionInput {
  executionId: string;
  taskId: string;
  agentId: string;
  projectId: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  context?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface AgentExecutionStepEvent {
  eventType: string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface AgentExecutionResult {
  executionId: string;
  taskId: string;
  agentId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  events: AgentExecutionStepEvent[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface AgentExecutionProvider {
  execute(input: AgentExecutionInput): Promise<AgentExecutionResult>;
  cancel(executionId: string): Promise<void>;
  getStatus(executionId: string): Promise<ExecutionStatus>;
}

