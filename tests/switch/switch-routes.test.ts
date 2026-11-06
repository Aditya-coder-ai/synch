import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { SwitchService } from '../../src/modules/switch/switch.service.js';
import { SwitchConnectionState, SwitchTransportType } from '../../src/modules/switch/switch.constants.js';

describe('Switch Integration Routes', () => {
  let mockSwitchService: Partial<SwitchService>;

  beforeEach(() => {
    mockSwitchService = {
      getStatus: vi.fn().mockReturnValue({
        enabled: true,
        connectionState: SwitchConnectionState.CONNECTED,
        transport: SwitchTransportType.WEBSOCKET,
        agentId: 'agent_coord_01',
        connectionId: '11111111-2222-3333-4444-555555555555',
        lastConnectedAt: '2026-11-06T12:00:00.000Z',
        lastDisconnectedAt: null,
        lastReceivedAt: '2026-11-06T12:05:00.000Z',
        lastSentAt: '2026-11-06T12:04:00.000Z',
        lastError: null,
        reconnectAttempts: 0,
      }),
      getHealth: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        message: 'Switch bridge is healthy',
      }),
      mapRoom: vi.fn().mockResolvedValue({
        id: 'conv_123',
        externalRoomId: '!room_abc:server',
      } as any),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'msg_delivered_456',
        deliveredAt: new Date('2026-11-06T12:10:00.000Z'),
        roomId: '!room_abc:server',
      }),
    };
  });

  it('GET /api/v1/integrations/switch/status should return sanitized integration metrics', async () => {
    const app = await buildApp({
      switchService: mockSwitchService as SwitchService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/switch/status',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.connectionState).toBe('CONNECTED');
    expect(json.data.agentId).toBe('agent_coord_01');
    expect(json.data.transport).toBe('WEBSOCKET');

    // Never leak API key in status
    expect(JSON.stringify(json)).not.toContain('apiKey');
    expect(JSON.stringify(json)).not.toContain('test_api_key');

    await app.close();
  });

  it('GET /api/v1/integrations/switch/health should return 200 when bridge is healthy', async () => {
    const app = await buildApp({
      switchService: mockSwitchService as SwitchService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/switch/health',
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.ok).toBe(true);
    expect(json.data.message).toBe('Switch bridge is healthy');

    await app.close();
  });

  it('GET /api/v1/integrations/switch/health should return 503 when bridge is unreachable', async () => {
    vi.mocked(mockSwitchService.getHealth!).mockResolvedValue({
      ok: false,
      status: 503,
      message: 'Failed to reach Switch server: ECONNREFUSED',
    });

    const app = await buildApp({
      switchService: mockSwitchService as SwitchService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/integrations/switch/health',
    });

    expect(response.statusCode).toBe(503);
    const json = response.json();
    expect(json.success).toBe(false);
    expect(json.data.ok).toBe(false);

    await app.close();
  });

  it('POST /api/v1/integrations/switch/rooms/map should map a Switch room ID', async () => {
    const app = await buildApp({
      switchService: mockSwitchService as SwitchService,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/switch/rooms/map',
      payload: {
        roomId: '!room_abc:server',
        conversationId: 'conv_123',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.mapped).toBe(true);
    expect(json.data.roomId).toBe('!room_abc:server');
    expect(json.data.conversationId).toBe('conv_123');

    await app.close();
  });

  it('POST /api/v1/integrations/switch/messages should send outbound message', async () => {
    const app = await buildApp({
      switchService: mockSwitchService as SwitchService,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/integrations/switch/messages',
      payload: {
        roomId: '!room_abc:server',
        content: 'Verification passed for execution wave 1',
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.success).toBe(true);
    expect(json.data.messageId).toBe('msg_delivered_456');

    await app.close();
  });
});
