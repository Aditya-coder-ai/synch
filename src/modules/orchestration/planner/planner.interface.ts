import type { StructuredExecutionPlan } from '../core/orchestration.types.js';

export interface PlanningInput {
  objective: string;
  projectId: string;
  context?: Record<string, unknown>;
  availableRoles?: string[];
}

export interface PlanningResult {
  success: boolean;
  plan?: StructuredExecutionPlan;
  isAmbiguous?: boolean;
  ambiguityReasons?: string[];
  errorMessage?: string;
}

export interface ITaskPlanner {
  plan(input: PlanningInput): Promise<PlanningResult>;
}

