import { describe, it, expect } from 'vitest';
import { SwitchMapper } from '../../src/modules/switch/switch.mapper.js';
import { MessageSenderType } from '../../src/database/types.js';
import { SwitchEventType } from '../../src/modules/switch/switch.constants.js';
import { SwitchProtocolError } from '../../src/modules/switch/switch.errors.js';

describe('Switch Protocol Mapper', () => {
  describe('determineSenderType', () => {
    it('should identify HUMAN from switch-user participant ID', () => {
      const type = SwitchMapper.determineSenderType('@switch-user-94f8b2:myserver');
      expect(type).toBe(MessageSenderType.HUMAN);
    });

    it('should identify AGENT from switch-agent participant ID', () => {
      const type = SwitchMapper.determineSenderType('@switch-agent-coordinator:myserver');
      expect(type).toBe(MessageSenderType.AGENT);
    });

    it('should identify SYSTEM from switch-admin or switch-bridge participant ID', () => {
      expect(SwitchMapper.determineSenderType('@switch-admin:myserver')).toBe(
        MessageSenderType.SYSTEM,
      );
      expect(SwitchMapper.determineSenderType('@switch-bridge:myserver')).toBe(
        MessageSenderType.SYSTEM,
      );
    });

    it('should default unknown or empty senders to SYSTEM', () => {
      expect(SwitchMapper.determineSenderType('')).toBe(MessageSenderType.SYSTEM);
      expect(SwitchMapper.determineSenderType('custom-service')).toBe(MessageSenderType.SYSTEM);
    });
  });

  describe('normalizeFrame', () => {
    it('should normalize a standard Switch message event frame', () => {
      const frame = {
        id: 4812,
        event: 'message',
        room_id: '!room_abc123:myserver',
        payload: {
          addressed: true,
          sender: '@switch-user-aditya:myserver',
          sender_name: 'Aditya',
          message_id: 'm_998877',
          body: 'Deploy Phase 3 to staging',
          timestamp: 1730900000000,
          thread_id: null,
          attachments: [],
        },
      };

      const event = SwitchMapper.normalizeFrame(frame);

      expect(event.eventId).toBe('4812');
      expect(event.roomId).toBe('!room_abc123:myserver');
      expect(event.senderId).toBe('@switch-user-aditya:myserver');
      expect(event.senderName).toBe('Aditya');
      expect(event.senderType).toBe(MessageSenderType.HUMAN);
      expect(event.content).toBe('Deploy Phase 3 to staging');
      expect(event.eventType).toBe(SwitchEventType.MESSAGE);
      expect(event.metadata.addressed).toBe(true);
      expect(event.metadata.messageId).toBe('m_998877');
    });

    it('should normalize a Switch command event frame', () => {
      const frame = {
        id: 4813,
        event: 'command',
        room_id: '!room_abc123:myserver',
        payload: {
          command: 'reset',
          args: 'coordinator',
          user_id: '@switch-user-aditya:myserver',
          user_name: 'Aditya',
        },
      };

      const event = SwitchMapper.normalizeFrame(frame);

      expect(event.eventId).toBe('4813');
      expect(event.content).toBe('!reset coordinator');
      expect(event.eventType).toBe(SwitchEventType.COMMAND);
      expect(event.senderType).toBe(MessageSenderType.HUMAN);
    });

    it('should normalize a Switch room_join event frame', () => {
      const frame = {
        id: 4814,
        event: 'room_join',
        room_id: '!room_abc123:myserver',
        payload: {
          member: '@switch-agent-tester:myserver',
          member_name: 'QA Agent',
          timestamp: 1730900050000,
          listening: true,
        },
      };

      const event = SwitchMapper.normalizeFrame(frame);

      expect(event.eventId).toBe('4814');
      expect(event.senderType).toBe(MessageSenderType.AGENT);
      expect(event.content).toBe('QA Agent joined room');
      expect(event.eventType).toBe(SwitchEventType.ROOM_JOIN);
    });

    it('should throw SwitchProtocolError on malformed message payload', () => {
      const invalidFrame = {
        event: 'message',
        payload: {
          // missing sender and message_id
          body: 'Incomplete',
        },
      };

      expect(() => SwitchMapper.normalizeFrame(invalidFrame)).toThrowError(SwitchProtocolError);
    });
  });
});

