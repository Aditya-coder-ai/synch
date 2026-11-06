import { MessageSenderType } from '../../database/types.js';
import { SwitchEventType, SwitchParticipantPrefix } from './switch.constants.js';
import {
  switchMessagePayloadSchema,
  switchCommandPayloadSchema,
  switchRoomJoinPayloadSchema,
} from './switch.schemas.js';
import type { NormalizedSwitchEvent, SwitchEventFrame } from './switch.types.js';
import { SwitchProtocolError } from './switch.errors.js';

export class SwitchMapper {
  /**
   * Identifies sender type from official participant format: @switch-<type>-<shortId>:<server>
   */
  static determineSenderType(senderId: string): MessageSenderType {
    if (!senderId) {
      return MessageSenderType.SYSTEM;
    }

    const lower = senderId.toLowerCase();
    if (lower.includes(SwitchParticipantPrefix.USER)) {
      return MessageSenderType.HUMAN;
    }
    if (lower.includes(SwitchParticipantPrefix.AGENT)) {
      return MessageSenderType.AGENT;
    }
    if (lower.includes(SwitchParticipantPrefix.ADMIN) || lower.includes(SwitchParticipantPrefix.BRIDGE)) {
      return MessageSenderType.SYSTEM;
    }

    return MessageSenderType.SYSTEM;
  }

  /**
   * Normalizes an incoming SwitchEventFrame into CrewFlow's internal domain event.
   */
  static normalizeFrame(frame: SwitchEventFrame): NormalizedSwitchEvent {
    const eventType = frame.event;
    const roomId = frame.room_id || 'global';
    const sequenceId = frame.id !== undefined ? String(frame.id) : undefined;

    switch (eventType) {
      case SwitchEventType.MESSAGE: {
        const parsed = switchMessagePayloadSchema.safeParse(frame.payload);
        if (!parsed.success) {
          throw new SwitchProtocolError('Invalid Switch message payload', parsed.error.issues);
        }
        const p = parsed.data;
        const senderType = this.determineSenderType(p.sender);

        return {
          eventId: sequenceId || p.message_id,
          roomId,
          senderId: p.sender,
          senderName: p.sender_name,
          senderType,
          content: p.body,
          timestamp: new Date(p.timestamp),
          eventType: SwitchEventType.MESSAGE,
          threadId: p.thread_id,
          metadata: {
            addressed: p.addressed,
            messageId: p.message_id,
            attachments: p.attachments,
          },
        };
      }

      case SwitchEventType.COMMAND: {
        const parsed = switchCommandPayloadSchema.safeParse(frame.payload);
        if (!parsed.success) {
          throw new SwitchProtocolError('Invalid Switch command payload', parsed.error.issues);
        }
        const p = parsed.data;

        return {
          eventId: sequenceId || `cmd_${Date.now()}`,
          roomId,
          senderId: p.user_id || 'switch-system',
          senderName: p.user_name || 'System Command',
          senderType: MessageSenderType.HUMAN,
          content: `!${p.command} ${p.args}`.trim(),
          timestamp: new Date(),
          eventType: SwitchEventType.COMMAND,
          threadId: p.thread_id,
          metadata: {
            command: p.command,
            args: p.args,
          },
        };
      }

      case SwitchEventType.ROOM_JOIN: {
        const parsed = switchRoomJoinPayloadSchema.safeParse(frame.payload);
        if (!parsed.success) {
          throw new SwitchProtocolError('Invalid Switch room_join payload', parsed.error.issues);
        }
        const p = parsed.data;

        return {
          eventId: sequenceId || `join_${p.member}_${p.timestamp}`,
          roomId,
          senderId: p.member,
          senderName: p.member_name,
          senderType: this.determineSenderType(p.member),
          content: `${p.member_name} joined room`,
          timestamp: new Date(p.timestamp),
          eventType: SwitchEventType.ROOM_JOIN,
          metadata: {
            listening: p.listening,
          },
        };
      }

      default: {
        return {
          eventId: sequenceId || `ev_${Date.now()}`,
          roomId,
          senderId: 'switch-system',
          senderName: 'Switch System',
          senderType: MessageSenderType.SYSTEM,
          content: `System event: ${eventType}`,
          timestamp: new Date(),
          eventType,
          metadata: typeof frame.payload === 'object' && frame.payload !== null
            ? (frame.payload as Record<string, unknown>)
            : { raw: frame.payload },
        };
      }
    }
  }
}

