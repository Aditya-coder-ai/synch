import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwitchEventProcessor } from '../../src/modules/switch/switch.events.js';
import type { SwitchRepository } from '../../src/modules/switch/switch.repository.js';
import { SwitchEventType } from '../../src/modules/switch/switch.constants.js';

describe('Switch Event Processing Pipeline', () => {
  let mockRepository: Partial<SwitchRepository>;
  let processor: SwitchEventProcessor;

  beforeEach(() => {
    mockRepository = {
      isEventProcessed: vi.fn().mockResolvedValue(false),
      findConversationByRoomId: vi.fn(),
      recordEventLog: vi.fn().mockResolvedValue({} as any),
      createInboundMessage: vi.fn().mockResolvedValue({ id: 'msg_created_123' } as any),
    };
    processor = new SwitchEventProcessor(mockRepository as SwitchRepository, 'my_agent_id');
  });

  it('should skip control frames without database lookups', async () => {
    const result = await processor.processFrame({
      event: SwitchEventType.CONNECTION_STATE,
      payload: { connection_id: 'uuid', generation: 1 },
    });

    expect(result.status).toBe('CONTROL_FRAME');
    expect(mockRepository.isEventProcessed).not.toHaveBeenCalled();
  });

  it('should ignore echo messages originating from local agent or crewflow outbound', async () => {
    const frame = {
      id: 100,
      event: 'message',
      room_id: '!room1',
      payload: {
        message_id: 'm1',
        sender: '@switch-agent-my_agent_id:server',
        sender_name: 'Local Agent',
        body: 'Outbound echo',
        timestamp: Date.now(),
      },
    };

    const result = await processor.processFrame(frame);
    expect(result.status).toBe('IGNORED_ECHO');
    expect(mockRepository.createInboundMessage).not.toHaveBeenCalled();
  });

  it('should detect duplicate event IDs and avoid recreating messages', async () => {
    vi.mocked(mockRepository.isEventProcessed!).mockResolvedValue(true);

    const frame = {
      id: 101,
      event: 'message',
      room_id: '!room1',
      payload: {
        message_id: 'm_repeat',
        sender: '@switch-user-bob:server',
        sender_name: 'Bob',
        body: 'Retried delivery',
        timestamp: Date.now(),
      },
    };

    const result = await processor.processFrame(frame);
    expect(result.status).toBe('DUPLICATE');
    expect(mockRepository.createInboundMessage).not.toHaveBeenCalled();
  });

  it('should log diagnostic event and not attach to arbitrary project when room is unmapped', async () => {
    vi.mocked(mockRepository.isEventProcessed!).mockResolvedValue(false);
    vi.mocked(mockRepository.findConversationByRoomId!).mockResolvedValue(null);

    const frame = {
      id: 102,
      event: 'message',
      room_id: '!unmapped_room:server',
      payload: {
        message_id: 'm_unmapped',
        sender: '@switch-user-charlie:server',
        sender_name: 'Charlie',
        body: 'Message in unknown room',
        timestamp: Date.now(),
      },
    };

    const result = await processor.processFrame(frame);

    expect(result.status).toBe('UNMAPPED_ROOM');
    expect(mockRepository.recordEventLog).toHaveBeenCalledWith(
      '102',
      'message',
      '!unmapped_room:server',
      '@switch-user-charlie:server',
      'UNMAPPED_ROOM',
      expect.any(Object),
    );
    expect(mockRepository.createInboundMessage).not.toHaveBeenCalled();
  });

  it('should successfully normalize, map, and persist inbound message in mapped conversation', async () => {
    vi.mocked(mockRepository.isEventProcessed!).mockResolvedValue(false);
    vi.mocked(mockRepository.findConversationByRoomId!).mockResolvedValue({
      id: 'conv_crewflow_99',
      project: { id: 'proj_1', name: 'Core', workspaceId: 'ws_1' },
    } as any);

    const frame = {
      id: 103,
      event: 'message',
      room_id: '!mapped_room:server',
      payload: {
        message_id: 'm_valid',
        sender: '@switch-user-alice:server',
        sender_name: 'Alice',
        body: 'Please review task #42',
        timestamp: Date.now(),
      },
    };

    const result = await processor.processFrame(frame);

    expect(result.status).toBe('PROCESSED');
    expect(result.conversationId).toBe('conv_crewflow_99');
    expect(result.messageId).toBe('msg_created_123');
    expect(mockRepository.createInboundMessage).toHaveBeenCalledWith(
      'conv_crewflow_99',
      expect.objectContaining({
        content: 'Please review task #42',
        senderName: 'Alice',
      }),
    );
    expect(mockRepository.recordEventLog).toHaveBeenCalledWith(
      '103',
      'message',
      '!mapped_room:server',
      '@switch-user-alice:server',
      'PROCESSED',
      expect.any(Object),
    );
  });
});

