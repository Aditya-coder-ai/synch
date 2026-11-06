export interface OrchestrationPolicy {
  maxParallelTasks: number;
  maxWorkloadPerAgent: number;
  allowBusyAgents: boolean;
  taskTimeoutMs: number;
  maxRetryAttempts: number;
  planValidationStrict: boolean;
}

export const DEFAULT_ORCHESTRATION_POLICY: OrchestrationPolicy = {
  maxParallelTasks: 5,
  maxWorkloadPerAgent: 3,
  allowBusyAgents: false,
  taskTimeoutMs: 30000,
  maxRetryAttempts: 1,
  planValidationStrict: true,
};
