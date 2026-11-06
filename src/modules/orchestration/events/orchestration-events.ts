export const OrchestrationEventType = {
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  PLANNING_STARTED: 'PLANNING_STARTED',
  PLAN_READY: 'PLAN_READY',
  TASKS_ASSIGNED: 'TASKS_ASSIGNED',
  EXECUTION_SCHEDULED: 'EXECUTION_SCHEDULED',
  EXECUTION_STARTED: 'EXECUTION_STARTED',
  EXECUTION_COMPLETED: 'EXECUTION_COMPLETED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  ORCHESTRATION_COMPLETED: 'ORCHESTRATION_COMPLETED',
  ORCHESTRATION_FAILED: 'ORCHESTRATION_FAILED',
} as const;

export type OrchestrationEventType =
  (typeof OrchestrationEventType)[keyof typeof OrchestrationEventType];

export interface OrchestrationDomainEvent {
  orchestrationId: string;
  projectId: string;
  conversationId?: string | null;
  eventType: OrchestrationEventType | string;
  message: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

