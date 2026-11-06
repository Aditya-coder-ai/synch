import type { SwitchConfig } from './switch.config.js';
import {
  SwitchError,
  SwitchAuthError,
  SwitchRoomNotFoundError,
  SwitchConnectionError,
} from './switch.errors.js';
import type { SwitchOutboundResult } from './switch.types.js';

export class SwitchClient {
  constructor(private readonly config: SwitchConfig) {}

  /**
   * Probes the Switch server health via GET /health.
   */
  async probeHealth(): Promise<{ ok: boolean; status: number }> {
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/health`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.connectionTimeoutMs),
      });
      return { ok: res.ok, status: res.status };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach Switch server';
      throw new SwitchConnectionError(`Health probe failed: ${message}`, { url });
    }
  }

  /**
   * Posts an outbound message to a Switch room via POST /agents/{agent_id}/message.
   * This endpoint is officially documented and needs no active connection.
   */
  async postMessage(roomId: string, content: string): Promise<SwitchOutboundResult> {
    if (!this.config.agentId || !this.config.apiKey) {
      throw new SwitchAuthError('Agent ID and API Key are required to post outbound messages');
    }

    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/agents/${encodeURIComponent(this.config.agentId)}/message`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          room_id: roomId,
          content,
        }),
        signal: AbortSignal.timeout(this.config.connectionTimeoutMs),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new SwitchAuthError('Switch rejected authorization bearer token');
        }
        if (res.status === 404) {
          throw new SwitchRoomNotFoundError(roomId);
        }
        const errorText = await res.text().catch(() => '');
        throw new SwitchError(
          `Failed to send message to Switch room '${roomId}' (HTTP ${res.status}): ${errorText}`,
          res.status,
        );
      }

      const body = (await res.json().catch(() => ({}))) as { id?: string; message_id?: string };
      return {
        success: true,
        messageId: body.message_id || body.id,
        deliveredAt: new Date(),
        roomId,
      };
    } catch (err: unknown) {
      if (err instanceof SwitchError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Network error';
      throw new SwitchConnectionError(`Failed to dispatch message to Switch room: ${message}`, {
        roomId,
      });
    }
  }

  /**
   * Calls a documented Switch operation via POST /agents/{agent_id}/ops/{operation}.
   */
  async callOperation(operation: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/agents/${encodeURIComponent(this.config.agentId)}/ops/${encodeURIComponent(operation)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-Connection-Id': this.config.connectionId,
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(this.config.connectionTimeoutMs),
    });

    if (!res.ok) {
      if (res.status === 401) throw new SwitchAuthError();
      const text = await res.text().catch(() => '');
      throw new SwitchError(`Operation '${operation}' failed (HTTP ${res.status}): ${text}`);
    }

    return res.json().catch(() => ({}));
  }
}
