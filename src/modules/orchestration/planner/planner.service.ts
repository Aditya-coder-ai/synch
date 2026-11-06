import type { ITaskPlanner, PlanningInput, PlanningResult } from './planner.interface.js';
import { BaselinePlanningStrategy } from './planning-strategy.js';
import { AmbiguousRequestError, PlanningError } from '../core/orchestration.errors.js';

export class PlannerService implements ITaskPlanner {
  constructor(private readonly strategy: BaselinePlanningStrategy = new BaselinePlanningStrategy()) {}

  async plan(input: PlanningInput): Promise<PlanningResult> {
    if (!input.objective || typeof input.objective !== 'string') {
      throw new AmbiguousRequestError('A non-empty task objective string is required');
    }

    const result = this.strategy.generatePlan(input);

    if (result.isAmbiguous) {
      throw new AmbiguousRequestError(
        result.errorMessage || 'The request is ambiguous or underspecified',
        { ambiguityReasons: result.ambiguityReasons },
      );
    }

    if (!result.success || !result.plan) {
      throw new PlanningError(result.errorMessage || 'Failed to generate execution plan');
    }

    return result;
  }
}
