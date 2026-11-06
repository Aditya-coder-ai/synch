import {
  OpenCodeConnectionError,
  OpenCodeTimeoutError,
  OpenCodeUnavailableError,
} from './opencode.errors.js';
import {
  openCodeHealthSchema,
  sessionResponseSchema,
  type CreateSessionRequest,
  type OpenCodeHealthResponse,
  type SendMessageRequest,
  type SessionDiffResponse,
  type SessionResponse,
} from './opencode.schemas.js';
import type { RuntimeConfig } from '../runtime.config.js';

export interface OpenCodeClientOptions {
  config: RuntimeConfig;
  fetchFn?: typeof fetch;
}

export class OpenCodeClient {
  private readonly baseUrl: string;
  private readonly authHeader?: string;
  private readonly defaultTimeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenCodeClientOptions) {
    this.baseUrl = options.config.baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = options.config.timeoutMs;
    this.fetchFn = options.fetchFn ?? fetch;

    if (options.config.password) {
      const creds = `${options.config.username}:${options.config.password}`;
      this.authHeader = `Basic ${Buffer.from(creds).toString('base64')}`;
    }
  }

  /**
   * Internal authenticated fetch helper with timeout and error wrapping.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new OpenCodeConnectionError(
          `OpenCode server responded with HTTP ${response.status} on ${endpoint}: ${errorText.slice(0, 300)}`,
          { status: response.status, endpoint },
        );
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const text = await response.text();
      return text ? (JSON.parse(text) as T) : ({} as T);
    } catch (err: unknown) {
      if (err instanceof OpenCodeConnectionError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenCodeTimeoutError(
          `OpenCode request to '${endpoint}' timed out after ${timeoutMs}ms`,
          { endpoint, timeoutMs },
        );
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new OpenCodeUnavailableError(
        `Unable to reach OpenCode server at ${this.baseUrl}: ${message}`,
        { endpoint, baseUrl: this.baseUrl },
      );
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  /**
   * Checks health and version of the OpenCode server.
   */
  async checkHealth(): Promise<OpenCodeHealthResponse> {
    const data = await this.request<unknown>('/global/health', { method: 'GET' });
    const parsed = openCodeHealthSchema.safeParse(data);
    if (!parsed.success) {
      throw new OpenCodeConnectionError('Invalid health response format from OpenCode server', {
        issues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  /**
   * Creates a new OpenCode execution session.
   */
  async createSession(request: CreateSessionRequest): Promise<SessionResponse> {
    const data = await this.request<unknown>('/session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    const parsed = sessionResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OpenCodeConnectionError('Invalid session creation response from OpenCode server', {
        issues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  /**
   * Retrieves session details.
   */
  async getSession(sessionId: string): Promise<SessionResponse> {
    const data = await this.request<unknown>(`/session/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
    });
    return sessionResponseSchema.parse(data);
  }

  /**
   * Sends a message/prompt to an active session.
   */
  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<unknown> {
    return this.request<unknown>(`/session/${encodeURIComponent(sessionId)}/message`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Aborts an in-flight execution session.
   */
  async abortSession(sessionId: string): Promise<void> {
    await this.request<void>(`/session/${encodeURIComponent(sessionId)}/abort`, {
      method: 'POST',
    });
  }

  /**
   * Retrieves verified git diffs produced by an execution session.
   */
  async getDiff(sessionId: string): Promise<SessionDiffResponse> {
    return this.request<SessionDiffResponse>(
      `/session/${encodeURIComponent(sessionId)}/diff`,
      { method: 'GET' },
    );
  }

  /**
   * Deletes and cleans up a session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.request<void>(`/session/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Discovers agents available on the server.
   */
  async listAgents(): Promise<unknown[]> {
    return this.request<unknown[]>('/agent', { method: 'GET' });
  }
}
