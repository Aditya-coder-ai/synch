import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { SwitchService } from '../../switch/switch.service.js';
import type { OrchestrationDomainEvent } from './orchestration-events.js';
import { ExecutionStreamBroker, executionStreamBroker } from '../stream/stream.broker.js';

export interface OrchestrationEventHandlerOptions {
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
  streamBroker?: ExecutionStreamBroker;
}

export class OrchestrationEventHandler {
  private readonly prisma: PrismaClient;
  private readonly switchService?: SwitchService;
  private readonly broker: ExecutionStreamBroker;

  constructor(options: OrchestrationEventHandlerOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.switchService = options.switchService;
    this.broker = options.streamBroker ?? executionStreamBroker;
  }

  /**
   * Persists an orchestration event and publishes an update to Switch and live SSE stream.
   */
  async handleEvent(event: OrchestrationDomainEvent): Promise<void> {
    // 1. Persist the event to the database
    const created = await this.prisma.orchestrationEvent.create({
      data: {
        orchestrationId: event.orchestrationId,
        eventType: event.eventType,
        message: event.message,
        payload: (event.payload as unknown as Prisma.InputJsonValue) ?? {},
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });

    // 2. Publish to live streaming broker
    this.broker.publish(event.orchestrationId, {
      id: created.id,
      eventType: event.eventType,
      message: event.message,
      data: event.payload ?? {},
      timestamp: created.createdAt.toISOString(),
    });

    // 3. If a conversation is linked and Switch integration is available, notify the room
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
