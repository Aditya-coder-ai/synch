import type { SwitchConfig } from './switch.config.js';
import { SwitchClient } from './switch.client.js';
import { SwitchConnectionManager } from './switch.connection.js';
import { SwitchRepository } from './switch.repository.js';
import { SwitchEventProcessor } from './switch.events.js';
import { SwitchInboundAdapter } from './adapters/inbound.adapter.js';
import { SwitchOutboundAdapter } from './adapters/outbound.adapter.js';
import type {
  SwitchIntegrationStatus,
  SwitchOutboundMessageInput,
  SwitchOutboundResult,
} from './switch.types.js';
import type { PrismaClient } from '@prisma/client';

export interface SwitchServiceOptions {
  config: SwitchConfig;
  prismaClient?: PrismaClient;
  client?: SwitchClient;
  repository?: SwitchRepository;
  connectionManager?: SwitchConnectionManager;
}

export class SwitchService {
  public readonly config: SwitchConfig;
  public readonly client: SwitchClient;
  public readonly repository: SwitchRepository;
  public readonly connectionManager: SwitchConnectionManager;
  public readonly processor: SwitchEventProcessor;
  public readonly inboundAdapter: SwitchInboundAdapter;
  public readonly outboundAdapter: SwitchOutboundAdapter;

  private lastReceivedAt: Date | null = null;
  private lastSentAt: Date | null = null;
  private lastError: string | null = null;

  constructor(options: SwitchServiceOptions) {
    this.config = options.config;
    this.repository = options.repository ?? new SwitchRepository(options.prismaClient);
    this.client = options.client ?? new SwitchClient(this.config);
    this.connectionManager =
      options.connectionManager ?? new SwitchConnectionManager(this.config);
    this.processor = new SwitchEventProcessor(this.repository, this.config.agentId);
    this.inboundAdapter = new SwitchInboundAdapter(this.connectionManager, this.processor);
    this.outboundAdapter = new SwitchOutboundAdapter(this.client, this.repository);

    // Track frame arrival
    this.connectionManager.on('frame', () => {
      this.lastReceivedAt = new Date();
    });

    // Track connection errors without crashing EventEmitter
    this.connectionManager.on('error', err => {
      this.lastError = err instanceof Error ? err.message : String(err);
    });
  }

  async start(): Promise<void> {
    await this.connectionManager.start();
  }

  async stop(): Promise<void> {
    await this.connectionManager.stop();
  }

  getStatus(): SwitchIntegrationStatus {
    return {
      enabled: this.config.enabled,
      connectionState: this.connectionManager.getState(),
      transport: this.config.transport,
      agentId: this.config.agentId || 'not_configured',
      connectionId: this.config.connectionId,
      lastConnectedAt: this.connectionManager.lastConnectedAt?.toISOString() ?? null,
      lastDisconnectedAt: this.connectionManager.lastDisconnectedAt?.toISOString() ?? null,
      lastReceivedAt: this.lastReceivedAt?.toISOString() ?? null,
      lastSentAt: this.lastSentAt?.toISOString() ?? null,
      lastError: this.lastError ?? this.connectionManager.lastError,
      reconnectAttempts: this.connectionManager.getReconnectAttempts(),
    };
  }

  async getHealth(): Promise<{ ok: boolean; status: number; message: string }> {
    if (!this.config.enabled) {
      return { ok: true, status: 200, message: 'Switch integration is disabled' };
    }

    try {
      const probe = await this.client.probeHealth();
      return {
        ok: probe.ok,
        status: probe.status,
        message: probe.ok ? 'Switch bridge is healthy' : 'Switch bridge reported unhealthy status',
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 503,
        message: err instanceof Error ? err.message : 'Switch health probe failed',
      };
    }
  }

  async sendMessage(input: SwitchOutboundMessageInput): Promise<SwitchOutboundResult> {
    const result = await this.outboundAdapter.sendMessage(input);
    this.lastSentAt = new Date();
    return result;
  }

  async mapRoom(roomId: string, conversationId: string) {
    return this.repository.mapRoomToConversation(roomId, conversationId);
  }

  async getConversationByRoom(roomId: string) {
    return this.repository.findConversationByRoomId(roomId);
  }
}

