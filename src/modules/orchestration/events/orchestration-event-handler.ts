import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { SwitchService } from '../../switch/switch.service.js';
import type { OrchestrationDomainEvent } from './orchestration-events.js';

export interface OrchestrationEventHandlerOptions {
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
}

export class OrchestrationEventHandler {
  private readonly prisma: PrismaClient;
  private readonly switchService?: SwitchService;

  constructor(options: OrchestrationEventHandlerOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.switchService = options.switchService;
  }

  /**
   * Persists an orchestration event and publishes an update to Switch if mapped to a room.
   */
  async handleEvent(event: OrchestrationDomainEvent): Promise<void> {
    // 1. Persist the event to the database
    await this.prisma.orchestrationEvent.create({
      data: {
        orchestrationId: event.orchestrationId,
        eventType: event.eventType,
        message: event.message,
        payload: (event.payload as unknown as Prisma.InputJsonValue) ?? {},
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });

    // 2. If a conversation is linked and Switch integration is available, notify the room
    if (event.conversationId && this.switchService) {
      try {
        const conversation = await this.prisma.conversation.findUnique({
          where: { id: event.conversationId },
          select: { externalRoomId: true },
        });

        if (conversation?.externalRoomId) {
          const content = `[CrewFlow Orchestration] ${event.eventType}: ${event.message}`;
          await this.switchService.sendMessage({
            roomId: conversation.externalRoomId,
            content,
          });
        }
      } catch {
        // Safe out-of-band delivery; notification failure does not disrupt orchestration
      }
    }
  }
}
