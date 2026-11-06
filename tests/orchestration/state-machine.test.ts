import { describe, it, expect } from 'vitest';
import { OrchestrationStateMachine } from '../../src/modules/orchestration/state/state-machine.js';
import { OrchestrationStatus } from '../../src/database/types.js';
import { InvalidStateTransitionError } from '../../src/modules/orchestration/core/orchestration.errors.js';

describe('Orchestration State Machine', () => {
  it('should allow valid nominal lifecycle state transitions', () => {
    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.CREATED,
        OrchestrationStatus.PLANNING,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.PLANNING,
        OrchestrationStatus.PLAN_READY,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.PLAN_READY,
        OrchestrationStatus.SCHEDULED,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.SCHEDULED,
        OrchestrationStatus.RUNNING,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.RUNNING,
        OrchestrationStatus.COMPLETED,
      ),
    ).toBe(true);
  });

  it('should allow transitions to FAILED or CANCELLED from intermediate states', () => {
    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.RUNNING,
        OrchestrationStatus.FAILED,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.RUNNING,
        OrchestrationStatus.CANCELLED,
      ),
    ).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.PLANNING,
        OrchestrationStatus.FAILED,
      ),
    ).toBe(true);
  });

  it('should reject invalid transitions and throw InvalidStateTransitionError on assert', () => {
    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.CREATED,
        OrchestrationStatus.COMPLETED,
      ),
    ).toBe(false);

    expect(() =>
      OrchestrationStateMachine.assertTransition(
        OrchestrationStatus.CREATED,
        OrchestrationStatus.COMPLETED,
      ),
    ).toThrow(InvalidStateTransitionError);
  });

  it('should prevent transitions out of terminal states (COMPLETED, FAILED, CANCELLED)', () => {
    expect(OrchestrationStateMachine.isTerminal(OrchestrationStatus.COMPLETED)).toBe(true);
    expect(OrchestrationStateMachine.isTerminal(OrchestrationStatus.FAILED)).toBe(true);
    expect(OrchestrationStateMachine.isTerminal(OrchestrationStatus.CANCELLED)).toBe(true);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.COMPLETED,
        OrchestrationStatus.RUNNING,
      ),
    ).toBe(false);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.FAILED,
        OrchestrationStatus.RUNNING,
      ),
    ).toBe(false);

    expect(
      OrchestrationStateMachine.canTransition(
        OrchestrationStatus.CANCELLED,
        OrchestrationStatus.RUNNING,
      ),
    ).toBe(false);
  });
});
