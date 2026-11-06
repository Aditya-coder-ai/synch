import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwitchClient } from '../../src/modules/switch/switch.client.js';
import {
  SwitchAuthError,
  SwitchRoomNotFoundError,
  SwitchConnectionError,
} from '../../src/modules/switch/switch.errors.js';
import type { SwitchConfig } from '../../src/modules/switch/switch.config.js';
import { SwitchTransportType } from '../../src/modules/switch/switch.constants.js';

describe('SwitchClient', () => {
  const baseConfig: SwitchConfig = {
    enabled: true,
    baseUrl: 'https://switch.test.local',
    agentId: 'agent_coord_01',
    apiKey: 'test_api_key_abc',
    connectionId: '11111111-2222-3333-4444-555555555555',
    transport: SwitchTransportType.WEBSOCKET,
    connectionTimeoutMs: 2000,
    reconnectMaxAttempts: 3,
    filter: 'all',
    scope: 'all',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('probeHealth', () => {
    it('should return ok: true when GET /health responds with 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }),
      );

      const client = new SwitchClient(baseConfig);
      const result = await client.probeHealth();

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://switch.test.local/health',
        expect.any(Object),
      );
    });

    it('should throw SwitchConnectionError when health endpoint fails or times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const client = new SwitchClient(baseConfig);
      await expect(client.probeHealth()).rejects.toThrowError(SwitchConnectionError);
    });
  });

  describe('postMessage', () => {
    it('should deliver outbound message via POST /agents/{agent_id}/message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message_id: 'm_out_123', ok: true }), { status: 200 }),
      );

      const client = new SwitchClient(baseConfig);
      const result = await client.postMessage('!room_target:server', 'Task execution completed');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('m_out_123');
      expect(result.roomId).toBe('!room_target:server');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://switch.test.local/agents/agent_coord_01/message',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_api_key_abc',
          }),
          body: JSON.stringify({
            room_id: '!room_target:server',
            content: 'Task execution completed',
          }),
        }),
      );
    });

    it('should throw SwitchAuthError on HTTP 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const client = new SwitchClient(baseConfig);
      await expect(
        client.postMessage('!room_target:server', 'Hello'),
      ).rejects.toThrowError(SwitchAuthError);
    });

    it('should throw SwitchRoomNotFoundError on HTTP 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Room not found', { status: 404 }),
      );

      const client = new SwitchClient(baseConfig);
      await expect(
        client.postMessage('!nonexistent:server', 'Hello'),
      ).rejects.toThrowError(SwitchRoomNotFoundError);
    });
  });
});
