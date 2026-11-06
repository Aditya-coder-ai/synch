import { OrchestrationStatus } from '../../../database/types.js';
import { InvalidStateTransitionError } from '../core/orchestration.errors.js';

export class OrchestrationStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<
    OrchestrationStatus,
    readonly OrchestrationStatus[]
  > = {
    [OrchestrationStatus.CREATED]: [
      OrchestrationStatus.PLANNING,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.PLANNING]: [
      OrchestrationStatus.PLAN_READY,
      OrchestrationStatus.FAILED,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.PLAN_READY]: [
      OrchestrationStatus.SCHEDULED,
      OrchestrationStatus.RUNNING,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.SCHEDULED]: [
      OrchestrationStatus.RUNNING,
      OrchestrationStatus.PAUSED,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.RUNNING]: [
      OrchestrationStatus.PAUSED,
      OrchestrationStatus.COMPLETED,
      OrchestrationStatus.FAILED,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.PAUSED]: [
      OrchestrationStatus.RUNNING,
      OrchestrationStatus.CANCELLED,
    ],
    [OrchestrationStatus.COMPLETED]: [],
    [OrchestrationStatus.FAILED]: [],
    [OrchestrationStatus.CANCELLED]: [],
  };

  /**
   * Asserts whether a transition from currentState to targetState is allowed.
   * Throws InvalidStateTransitionError if invalid.
   */
  public static assertTransition(
    currentState: OrchestrationStatus,
    targetState: OrchestrationStatus,
    reason?: string,
  ): void {
    if (currentState === targetState) {
      return; // No-op idempotent transition
    }

    const allowed = this.ALLOWED_TRANSITIONS[currentState] ?? [];
    if (!allowed.includes(targetState)) {
      throw new InvalidStateTransitionError(currentState, targetState, reason);
    }
  }

  /**
   * Checks if transition is valid without throwing.
   */
  public static canTransition(
    currentState: OrchestrationStatus,
    targetState: OrchestrationStatus,
  ): boolean {
    if (currentState === targetState) return true;
    const allowed = this.ALLOWED_TRANSITIONS[currentState] ?? [];
    return allowed.includes(targetState);
  }

  /**
   * Returns true if status represents a terminal state (cannot transition further).
   */
  public static isTerminal(status: OrchestrationStatus): boolean {
    return (
      status === OrchestrationStatus.COMPLETED ||
      status === OrchestrationStatus.FAILED ||
      status === OrchestrationStatus.CANCELLED
    );
  }
}
