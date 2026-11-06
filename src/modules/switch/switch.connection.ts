import { EventEmitter } from 'node:events';
import type { SwitchConfig } from './switch.config.js';
import {
  SwitchConnectionState,
  SwitchDefaults,
  SwitchTransportType,
} from './switch.constants.js';
import { SwitchConnectionError } from './switch.errors.js';
import type { SwitchEventFrame } from './switch.types.js';

export interface SwitchConnectionEvents {
  stateChange: (state: SwitchConnectionState) => void;
  frame: (frame: SwitchEventFrame) => void;
  error: (error: Error) => void;
}

export class SwitchConnectionManager extends EventEmitter {
  private state: SwitchConnectionState = SwitchConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private activeWs: WebSocket | null = null;
  private abortController: AbortController | null = null;
  private lastCursor = 0;
  private isShuttingDown = false;

  public lastConnectedAt: Date | null = null;
  public lastDisconnectedAt: Date | null = null;
  public lastError: string | null = null;

  constructor(private readonly config: SwitchConfig) {
    super();
  }

  getState(): SwitchConnectionState {
    return this.state;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getLastCursor(): number {
    return this.lastCursor;
  }

  private setState(newState: SwitchConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  /**
   * Starts the Switch connection lifecycle if enabled.
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.setState(SwitchConnectionState.DISCONNECTED);
      return;
    }

    if (this.state === SwitchConnectionState.CONNECTED || this.state === SwitchConnectionState.CONNECTING) {
      return;
    }

    this.isShuttingDown = false;
    this.reconnectAttempts = 0;
    await this.connect();
  }

  /**
   * Gracefully shuts down connection and cancels timers.
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.activeWs) {
      try {
        this.activeWs.close(1000, 'Client shutdown');
      } catch {
        // ignore close errors during shutdown
      }
      this.activeWs = null;
    }

    this.lastDisconnectedAt = new Date();
    this.setState(SwitchConnectionState.DISCONNECTED);
  }

  private async connect(): Promise<void> {
    if (this.isShuttingDown) return;

    this.setState(
      this.reconnectAttempts > 0
        ? SwitchConnectionState.RECONNECTING
        : SwitchConnectionState.CONNECTING,
    );

    try {
      if (this.config.transport === SwitchTransportType.WEBSOCKET) {
        await this.connectWebSocket();
      } else {
        await this.connectSSE();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      this.lastError = message;
      this.emit('error', new SwitchConnectionError(message));
      this.scheduleReconnect();
    }
  }

  /**
   * Connects to Switch over WebSocket:
   * GET /agents/{agent_id}/connection/ws?connection_id=<uuid>&scope=all&filter=all
   * Authorization: Bearer <apiKey>
   */
  private async connectWebSocket(): Promise<void> {
    const base = this.config.baseUrl.replace(/^http(s?):/, 'ws$1:').replace(/\/+$/, '');
    const params = new URLSearchParams({
      connection_id: this.config.connectionId,
      scope: this.config.scope,
      filter: this.config.filter,
      start_from: this.lastCursor > 0 ? String(this.lastCursor) : 'head',
    });

    const wsUrl = `${base}/agents/${encodeURIComponent(this.config.agentId)}/connection/ws?${params.toString()}`;

    // Establish WebSocket using globalThis.WebSocket
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    this.activeWs = ws;

    ws.onopen = () => {
      this.setState(SwitchConnectionState.CONNECTED);
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
      this.lastError = null;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : String(event.data);
        const data = JSON.parse(raw) as Record<string, unknown>;

        // Handle ping from Switch server
        if (data.type === 'ping' || data.event === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', cursor: this.lastCursor }));
          return;
        }

        // Domain or control frame
        const frame: SwitchEventFrame = {
          id: typeof data.id === 'number' ? data.id : undefined,
          event: String(data.event || data.type || 'unknown'),
          room_id: typeof data.room_id === 'string' ? data.room_id : undefined,
          payload: data.payload ?? data,
        };

        if (frame.id !== undefined && frame.id > this.lastCursor) {
          this.lastCursor = frame.id;
        }

        this.emit('frame', frame);
      } catch (parseError: unknown) {
        // Drop malformed frame without crashing
        this.emit(
          'error',
          new SwitchConnectionError(
            `Malformed frame: ${parseError instanceof Error ? parseError.message : 'JSON parse failure'}`,
          ),
        );
      }
    };

    ws.onclose = closeEvent => {
      this.activeWs = null;
      this.lastDisconnectedAt = new Date();

      if (closeEvent.code === 4401) {
        this.lastError = 'Authentication failed (Close code 4401)';
        this.setState(SwitchConnectionState.ERROR);
        return; // Do not endlessly retry bad auth
      }

      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      } else {
        this.setState(SwitchConnectionState.DISCONNECTED);
      }
    };

    ws.onerror = (evt: Event) => {
      const message = (evt as { message?: string }).message || 'WebSocket error';
      this.lastError = message;
      this.emit('error', new SwitchConnectionError(message));
    };
  }

  /**
   * Fallback SSE transport:
   * GET /agents/{agent_id}/events?connection_id=<uuid>&scope=all&filter=all
   */
  private async connectSSE(): Promise<void> {
    this.abortController = new AbortController();
    const params = new URLSearchParams({
      connection_id: this.config.connectionId,
      scope: this.config.scope,
      filter: this.config.filter,
      start_from: this.lastCursor > 0 ? String(this.lastCursor) : 'head',
    });

    const sseUrl = `${this.config.baseUrl.replace(/\/+$/, '')}/agents/${encodeURIComponent(this.config.agentId)}/events?${params.toString()}`;

    const res = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      signal: this.abortController.signal,
    });

    if (!res.ok) {
      throw new SwitchConnectionError(`SSE stream request failed with HTTP ${res.status}`);
    }

    this.setState(SwitchConnectionState.CONNECTED);
    this.lastConnectedAt = new Date();
    this.reconnectAttempts = 0;
    this.lastError = null;

    if (!res.body) {
      throw new SwitchConnectionError('SSE response body is empty');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!this.isShuttingDown) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const raw = JSON.parse(line.substring(6));
            const frame: SwitchEventFrame = {
              id: typeof raw.id === 'number' ? raw.id : undefined,
              event: raw.event || 'message',
              room_id: raw.room_id,
              payload: raw.payload ?? raw,
            };
            if (frame.id !== undefined && frame.id > this.lastCursor) {
              this.lastCursor = frame.id;
            }
            this.emit('frame', frame);
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    }
  }

  /**
   * Computes exponential backoff with jitter and schedules the next connection attempt.
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;

    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      this.setState(SwitchConnectionState.ERROR);
      this.lastError = `Max reconnect attempts (${this.config.reconnectMaxAttempts}) reached`;
      return;
    }

    this.setState(SwitchConnectionState.RECONNECTING);
    this.reconnectAttempts++;

    // Calculate delay = min(maxDelay, initialDelay * 2^attempts)
    const baseDelay = Math.min(
      SwitchDefaults.RECONNECT_MAX_DELAY_MS,
      SwitchDefaults.RECONNECT_INITIAL_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
    );

    // Apply jitter ratio +/- 25%
    const jitter = baseDelay * SwitchDefaults.RECONNECT_JITTER_RATIO * (Math.random() * 2 - 1);
    const delay = Math.max(500, Math.floor(baseDelay + jitter));

    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, delay);
  }
}
