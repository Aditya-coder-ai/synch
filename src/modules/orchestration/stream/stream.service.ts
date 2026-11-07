import type { PrismaClient } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getPrismaClient } from '../../../database/prisma.js';
import { OrchestrationNotFoundError } from '../core/orchestration.errors.js';
import { ExecutionStreamBroker, executionStreamBroker } from './stream.broker.js';
import { StreamEventType, type StreamChunk } from './stream.types.js';

export interface StreamServiceOptions {
  prismaClient?: PrismaClient;
  broker?: ExecutionStreamBroker;
  heartbeatIntervalMs?: number;
}

export class OrchestrationStreamService {
  private readonly prisma: PrismaClient;
  private readonly broker: ExecutionStreamBroker;
  private readonly heartbeatIntervalMs: number;

  constructor(options: StreamServiceOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.broker = options.broker ?? executionStreamBroker;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15000;
  }

  /**
   * Formats a stream chunk into a compliant Server-Sent Events (SSE) message payload.
   */
  public formatSSE(chunk: StreamChunk): string {
    const payload = JSON.stringify({
      id: chunk.id,
      orchestrationId: chunk.orchestrationId,
      eventType: chunk.eventType,
      message: chunk.message,
      data: chunk.data,
      timestamp: chunk.timestamp,
    });

    return `id: ${chunk.id}\nevent: ${chunk.eventType}\ndata: ${payload}\n\n`;
  }

  /**
   * Formats a keep-alive comment frame.
   */
  public formatPing(): string {
    return `:keep-alive ${Date.now()}\n\n`;
  }

  /**
   * Retrieves historical backlog for an orchestration session along with its current status.
   */
  public async getBacklog(orchestrationId: string): Promise<{ chunks: StreamChunk[]; status: string }> {
    const session = await this.prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new OrchestrationNotFoundError(orchestrationId);
    }

    const dbChunks: StreamChunk[] = session.events.map((ev) => ({
      id: ev.id,
      orchestrationId: ev.orchestrationId,
      eventType: ev.eventType,
      message: ev.message,
      data: (ev.payload as Record<string, unknown>) ?? {},
      timestamp: ev.createdAt.toISOString(),
    }));

    // Merge with in-memory buffer, deduplicating by ID
    const inMemory = this.broker.getRecentChunks(orchestrationId);
    const seenIds = new Set(dbChunks.map((c) => c.id));
    const merged = [...dbChunks];

    for (const chunk of inMemory) {
      if (!seenIds.has(chunk.id)) {
        merged.push(chunk);
        seenIds.add(chunk.id);
      }
    }

    return { chunks: merged, status: session.status };
  }

  /**
   * Attaches an incoming HTTP request/reply to a live SSE stream.
   */
  public async handleSSEStream(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const orchestrationId = request.params.id;

    // Verify orchestration exists and fetch backlog
    const { chunks: backlog, status } = await this.getBacklog(orchestrationId);

    // Set standard SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders?.();

    // 1. Send initial connection confirmation
    const connectionChunk: StreamChunk = {
      id: `conn_${Date.now()}`,
      orchestrationId,
      eventType: StreamEventType.CONNECTED,
      message: `Connected to execution stream for orchestration: ${orchestrationId}`,
      data: {
        orchestrationId,
        status,
        backlogCount: backlog.length,
      },
      timestamp: new Date().toISOString(),
    };
    reply.raw.write(this.formatSSE(connectionChunk));

    // 2. Stream backlog chunks
    for (const chunk of backlog) {
      reply.raw.write(this.formatSSE(chunk));
    }

    // If orchestration is already terminated, finish stream after sending backlog
    if (
      status === 'COMPLETED' ||
      status === 'FAILED' ||
      status === 'CANCELLED'
    ) {
      reply.raw.end();
      return;
    }

    // 3. Setup periodic keep-alive heartbeat
    let heartbeatInterval: NodeJS.Timeout | undefined;

    // 4. Cleanup on client disconnection or stream end
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      unsubscribe();
    };

    // 5. Subscribe to live broker events
    const unsubscribe = this.broker.subscribe(orchestrationId, (chunk: StreamChunk) => {
      try {
        reply.raw.write(this.formatSSE(chunk));
        if (
          chunk.eventType === StreamEventType.ORCHESTRATION_COMPLETED ||
          chunk.eventType === StreamEventType.ORCHESTRATION_FAILED
        ) {
          cleanup();
          reply.raw.end();
        }
      } catch {
        cleanup();
      }
    });

    heartbeatInterval = setInterval(() => {
      try {
        reply.raw.write(this.formatPing());
      } catch {
        cleanup();
      }
    }, this.heartbeatIntervalMs);

    request.raw.on('close', cleanup);
    request.raw.on('end', cleanup);
  }
}

export const orchestrationStreamService = new OrchestrationStreamService();
