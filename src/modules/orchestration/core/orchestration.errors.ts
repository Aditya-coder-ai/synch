import { AppError } from '../../../common/errors/app-error.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';

export class OrchestrationError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCode.ORCHESTRATION_ERROR,
    details?: unknown,
  ) {
    super(message, statusCode, code, details);
    this.name = 'OrchestrationError';
  }
}

export class OrchestrationNotFoundError extends OrchestrationError {
  constructor(orchestrationId: string) {
    super(
      `Orchestration session '${orchestrationId}' not found`,
      404,
      ErrorCode.ORCHESTRATION_NOT_FOUND,
      { orchestrationId },
    );
    this.name = 'OrchestrationNotFoundError';
  }
}

export class AmbiguousRequestError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCode.AMBIGUOUS_REQUEST, details);
    this.name = 'AmbiguousRequestError';
  }
}

export class PlanningError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(message, 422, ErrorCode.PLANNING_ERROR, details);
    this.name = 'PlanningError';
  }
}

export class AgentSelectionError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(message, 404, ErrorCode.AGENT_UNAVAILABLE, details);
    this.name = 'AgentSelectionError';
  }
}

export class DependencyGraphError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCode.DEPENDENCY_CYCLE, details);
    this.name = 'DependencyGraphError';
  }
}

export class DependencyCycleError extends DependencyGraphError {
  constructor(message: string, details?: unknown) {
    super(message, details);
    this.name = 'DependencyCycleError';
  }
}

export class InvalidStateTransitionError extends OrchestrationError {
  constructor(fromState: string, toState: string, reason?: string) {
    super(
      `Invalid orchestration state transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`,
      409,
      ErrorCode.INVALID_STATE_TRANSITION,
      { fromState, toState, reason },
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class ExecutionDispatchError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(message, 502, ErrorCode.DISPATCH_ERROR, details);
    this.name = 'ExecutionDispatchError';
  }
}
