import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { OrchestrationStatus } from '../../../database/types.js';
import { OrchestrationNotFoundError } from '../core/orchestration.errors.js';
import { OrchestrationStateMachine } from './state-machine.js';

export interface OrchestrationStateServiceOptions {
  prismaClient?: PrismaClient;
}

export class OrchestrationStateService {
  private readonly prisma: PrismaClient;

  constructor(options: OrchestrationStateServiceOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Retrieves the current status of an orchestration session.
   */
  async getStatus(orchestrationId: string): Promise<OrchestrationStatus> {
    const record = await this.prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      select: { status: true },
    });

    if (!record) {
      throw new OrchestrationNotFoundError(orchestrationId);
    }

    return record.status as OrchestrationStatus;
  }

  /**
   * Transitions an orchestration session to a new status with validation against the state machine.
   */
  async transitionTo(
    orchestrationId: string,
    targetStatus: OrchestrationStatus,
    reason?: string,
  ): Promise<OrchestrationStatus> {
    const current = await this.getStatus(orchestrationId);

    // Validate transition
    OrchestrationStateMachine.assertTransition(current, targetStatus, reason);

    const now = new Date();
    const updateData: {
      status: OrchestrationStatus;
      startedAt?: Date;
      completedAt?: Date;
      error?: string | null;
    } = {
      status: targetStatus,
    };

    if (targetStatus === OrchestrationStatus.RUNNING && current !== OrchestrationStatus.PAUSED) {
      updateData.startedAt = now;
    } else if (OrchestrationStateMachine.isTerminal(targetStatus)) {
      updateData.completedAt = now;
      if (targetStatus === OrchestrationStatus.FAILED && reason) {
        updateData.error = reason;
      }
    }

    await this.prisma.orchestration.update({
      where: { id: orchestrationId },
      data: updateData,
    });

    return targetStatus;
  }
}
