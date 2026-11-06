import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { OrchestrationStatus } from '../../../database/types.js';
import { OrchestrationNotFoundError } from './orchestration.errors.js';
import { Orchestrator } from './orchestrator.js';
import type { OrchestrationExecutionSummary, OrchestrationRequestInput } from './orchestration.types.js';
import { OrchestrationStateService } from '../state/orchestration-state.js';

export interface OrchestrationServiceOptions {
  prismaClient?: PrismaClient;
  orchestrator?: Orchestrator;
}

export class OrchestrationService {
  private readonly prisma: PrismaClient;
  private readonly orchestrator: Orchestrator;
  private readonly stateService: OrchestrationStateService;

  constructor(options: OrchestrationServiceOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.orchestrator = options.orchestrator ?? new Orchestrator({ prismaClient: this.prisma });
    this.stateService = new OrchestrationStateService({ prismaClient: this.prisma });
  }

  /**
   * Creates a new orchestration session and triggers planning/execution.
   */
  async startOrchestration(input: OrchestrationRequestInput): Promise<OrchestrationExecutionSummary> {
    return this.orchestrator.orchestrate(input);
  }

  /**
   * Retrieves an orchestration session by ID with its associated tasks.
   */
  async getOrchestration(orchestrationId: string) {
    const session = await this.prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      include: {
        tasks: {
          include: {
            assignedAgent: true,
            assignedUser: true,
            dependencies: true,
            dependents: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new OrchestrationNotFoundError(orchestrationId);
    }

    return session;
  }

  /**
   * Retrieves the immutable event log for an orchestration session.
   */
  async getOrchestrationEvents(orchestrationId: string) {
    const events = await this.prisma.orchestrationEvent.findMany({
      where: { orchestrationId },
      orderBy: { createdAt: 'asc' },
    });

    if (events.length === 0) {
      // Verify session exists
      const session = await this.prisma.orchestration.findUnique({
        where: { id: orchestrationId },
        select: { id: true },
      });
      if (!session) {
        throw new OrchestrationNotFoundError(orchestrationId);
      }
    }

    return events;
  }

  /**
   * Safely cancels an active orchestration session.
   */
  async cancelOrchestration(orchestrationId: string, reason = 'User requested cancellation') {
    await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.CANCELLED, reason);
    return this.getOrchestration(orchestrationId);
  }
}
