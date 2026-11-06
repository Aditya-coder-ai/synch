import type { OpenCodeClient } from './opencode.client.js';
import { OpenCodeSessionError } from './opencode.errors.js';
import type { PermissionRule, SessionDiffResponse } from './opencode.schemas.js';

export interface OpenCodeSessionDescriptor {
  sessionId: string;
  projectId: string;
  taskId: string;
  agentId: string;
  createdAt: string;
  active: boolean;
}

export interface CreateSessionOptions {
  projectId: string;
  taskId: string;
  agentId: string;
  title: string;
  permissionRules?: PermissionRule[];
}

export class OpenCodeSessionManager {
  private readonly client: OpenCodeClient;
  private readonly activeSessions = new Map<string, OpenCodeSessionDescriptor>();

  constructor(client: OpenCodeClient) {
    this.client = client;
  }

  /**
   * Initializes a new session on the OpenCode server.
   */
  async startSession(options: CreateSessionOptions): Promise<OpenCodeSessionDescriptor> {
    const sessionRes = await this.client.createSession({
      title: options.title,
      metadata: {
        projectId: options.projectId,
        taskId: options.taskId,
        agentId: options.agentId,
      },
      permission: options.permissionRules,
    });

    const descriptor: OpenCodeSessionDescriptor = {
      sessionId: sessionRes.id,
      projectId: options.projectId,
      taskId: options.taskId,
      agentId: options.agentId,
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.activeSessions.set(sessionRes.id, descriptor);
    return descriptor;
  }

  /**
   * Submits prompt content and instructions to an existing session.
   */
  async submitMessage(
    sessionId: string,
    messageText: string,
    systemPrompt?: string,
    allowedTools?: Record<string, boolean>,
  ): Promise<unknown> {
    const descriptor = this.activeSessions.get(sessionId);
    if (!descriptor || !descriptor.active) {
      throw new OpenCodeSessionError(`Session '${sessionId}' is not active or has been closed`);
    }

    return this.client.sendMessage(sessionId, {
      parts: [{ type: 'text', text: messageText }],
      system: systemPrompt,
      tools: allowedTools,
    });
  }

  /**
   * Retrieves diff evidence from the session.
   */
  async getDiffEvidence(sessionId: string): Promise<SessionDiffResponse> {
    return this.client.getDiff(sessionId);
  }

  /**
   * Aborts an active session.
   */
  async abortSession(sessionId: string): Promise<void> {
    const descriptor = this.activeSessions.get(sessionId);
    if (descriptor) {
      descriptor.active = false;
      await this.client.abortSession(sessionId).catch(() => {});
    }
  }

  /**
   * Closes and cleans up a session.
   */
  async closeSession(sessionId: string): Promise<void> {
    const descriptor = this.activeSessions.get(sessionId);
    if (descriptor) {
      descriptor.active = false;
      this.activeSessions.delete(sessionId);
      await this.client.deleteSession(sessionId).catch(() => {});
    }
  }

  /**
   * Returns active sessions.
   */
  getActiveSessions(): OpenCodeSessionDescriptor[] {
    return Array.from(this.activeSessions.values()).filter(s => s.active);
  }
}
