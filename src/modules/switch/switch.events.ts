import { SwitchMapper } from './switch.mapper.js';
import type { SwitchRepository } from './switch.repository.js';
import type { SwitchEventFrame, NormalizedSwitchEvent } from './switch.types.js';
import { SwitchEventType } from './switch.constants.js';

export interface EventProcessingResult {
  status: 'PROCESSED' | 'DUPLICATE' | 'UNMAPPED_ROOM' | 'IGNORED_ECHO' | 'CONTROL_FRAME';
  eventId: string;
  roomId?: string;
  conversationId?: string;
  messageId?: string;
}

export class SwitchEventProcessor {
  constructor(
    private readonly repository: SwitchRepository,
    private readonly localAgentId: string = '',
  ) {}

  /**
   * Processes a single incoming SwitchEventFrame through the validation,
   * deduplication, mapping, and persistence pipeline.
   */
  async processFrame(frame: SwitchEventFrame): Promise<EventProcessingResult> {
    // 1. Skip control frames from event processing
    if (
      frame.event === SwitchEventType.CONNECTION_STATE ||
      frame.event === SwitchEventType.GAP ||
      frame.event === SwitchEventType.EVICTED ||
      frame.event === SwitchEventType.SUBSCRIPTION_CHANGED
    ) {
      return {
        status: 'CONTROL_FRAME',
        eventId: frame.id !== undefined ? String(frame.id) : 'control',
      };
    }

    // 2. Normalize frame
    const event: NormalizedSwitchEvent = SwitchMapper.normalizeFrame(frame);

    // 3. Echo-loop prevention: Ignore messages that were sent by this client or agent
    if (
      this.localAgentId &&
      (event.senderId.includes(this.localAgentId) ||
        (event.metadata?.origin as string) === 'crewflow_outbound')
    ) {
      return {
        status: 'IGNORED_ECHO',
        eventId: event.eventId,
        roomId: event.roomId,
      };
    }

    // 4. Deduplication check
    const isDuplicate = await this.repository.isEventProcessed(event.eventId);
    if (isDuplicate) {
      return {
        status: 'DUPLICATE',
        eventId: event.eventId,
        roomId: event.roomId,
      };
    }

    // 5. Room Mapping
    const conversation = await this.repository.findConversationByRoomId(event.roomId);
    if (!conversation) {
      // Unmapped room: record safe diagnostic event log without guessing an arbitrary project
      await this.repository.recordEventLog(
        event.eventId,
        event.eventType,
        event.roomId,
        event.senderId,
        'UNMAPPED_ROOM',
        { eventType: event.eventType, senderId: event.senderId },
      );

      return {
        status: 'UNMAPPED_ROOM',
        eventId: event.eventId,
        roomId: event.roomId,
      };
    }

    // 6. Persistence: Save message only for message and command domain events
    let createdMessageId: string | undefined;
    if (event.eventType === SwitchEventType.MESSAGE || event.eventType === SwitchEventType.COMMAND) {
      const msg = await this.repository.createInboundMessage(conversation.id, event);
      createdMessageId = msg.id;
    }

    // 7. Mark event log as processed
    await this.repository.recordEventLog(
      event.eventId,
      event.eventType,
      event.roomId,
      event.senderId,
      'PROCESSED',
      { conversationId: conversation.id, projectId: conversation.project.id },
    );

    return {
      status: 'PROCESSED',
      eventId: event.eventId,
      roomId: event.roomId,
      conversationId: conversation.id,
      messageId: createdMessageId,
    };
  }
}

