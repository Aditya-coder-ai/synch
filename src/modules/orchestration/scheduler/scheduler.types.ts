import type { TaskPriority, TaskStatus } from '../../../database/types.js';

export interface TaskGraphNode {
  id: string; // tempId or persisted taskId
  projectId: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[]; // IDs of tasks this node depends on
  assignedAgentId?: string | null;
}

export interface DependencyGraphValidationResult {
  isValid: boolean;
  hasCycle: boolean;
  cycleNodes?: string[];
  missingDependencies?: { taskId: string; missingDependencyId: string }[];
  crossProjectDependencies?: { taskId: string; dependsOnTaskId: string }[];
  errors: string[];
}

export interface SchedulingTier {
  tierIndex: number;
  taskIds: string[];
}

export interface SchedulerEvaluationResult {
  readyTaskIds: string[]; // tasks eligible to run right now (prerequisites satisfied)
  blockedTaskIds: string[]; // tasks awaiting prerequisites
  failedPrerequisiteTaskIds: string[]; // tasks whose prerequisites failed
  completedTaskIds: string[];
  inProgressTaskIds: string[];
  allCompleted: boolean;
  hasFailures: boolean;
}

