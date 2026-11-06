import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../database/prisma.js';
import type { NormalizedSwitchEvent } from './switch.types.js';
import { MessageSenderType } from '../../database/types.js';

export class SwitchRepository {
  private readonly db: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.db = prismaClient ?? getPrismaClient();
  }

  /**
   * Finds the CrewFlow conversation mapped to a Switch room ID.
   */
  async findConversationByRoomId(roomId: string) {
    return this.db.conversation.findUnique({
      where: { externalRoomId: roomId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
          },
        },
      },
    });
  }

  /**
   * Maps a Switch room ID to an existing CrewFlow conversation.
   */
  async mapRoomToConversation(roomId: string, conversationId: string) {
    return this.db.conversation.update({
      where: { id: conversationId },
      data: {
        externalRoomId: roomId,
        source: 'switch',
      },
    });
  }

  /**
   * Verifies if an inbound event ID has already been processed (Deduplication).
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const existing = await this.db.switchEventLog.findUnique({
      where: { eventId },
      select: { id: true },
    });
    return Boolean(existing);
  }

  /**
   * Logs an incoming event in the append-only SwitchEventLog table.
   */
  async recordEventLog(
    eventId: string,
    eventType: string,
    roomId: string,
    senderId?: string | null,
    status = 'PROCESSED',
    payload: unknown = {},
  ) {
    return this.db.switchEventLog.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType,
        roomId,
        senderId: senderId ?? null,
        status,
        payload: payload as object,
      },
      update: {
        status,
      },
    });
  }

  /**
   * Persists an inbound normalized message in the conversation.
   * Uses externalMessageId to prevent duplicate message records.
   */
  async createInboundMessage(conversationId: string, event: NormalizedSwitchEvent) {
    return this.db.message.create({
      data: {
        conversationId,
        senderType: event.senderType,
        senderId: event.senderId,
        content: event.content,
        externalMessageId: event.eventId,
        metadata: {
          ...event.metadata,
          senderName: event.senderName,
          switchEventId: event.eventId,
          switchRoomId: event.roomId,
        },
        createdAt: event.timestamp,
      },
    });
  }

  /**
   * Persists an outbound message initiated from CrewFlow.
   */
  async createOutboundMessage(
    conversationId: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ) {
    return this.db.message.create({
      data: {
        conversationId,
        senderType: MessageSenderType.SYSTEM,
        senderId: 'crewflow-backend',
        content,
        metadata: {
          ...metadata,
          origin: 'crewflow_outbound',
        },
      },
    });
  }
}
