import EventEmitter from 'node:events';
import crypto from 'node:crypto';
import type { StreamChunk, StreamListener, StreamEventType } from './stream.types.js';

export interface StreamBrokerOptions {
  maxRecentChunks?: number;
}

export class ExecutionStreamBroker {
  private readonly emitter: EventEmitter;
  private readonly recentChunks: Map<string, StreamChunk[]>;
  private readonly maxRecentChunks: number;

  constructor(options: StreamBrokerOptions = {}) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(200); // Allow multiple SSE clients per orchestration
    this.recentChunks = new Map();
    this.maxRecentChunks = options.maxRecentChunks ?? 100;
  }

  private getChannel(orchestrationId: string): string {
    return `orchestration:${orchestrationId}`;
  }

  /**
   * Publishes a streaming chunk to all active subscribers of the orchestration session.
   */
  public publish(
    orchestrationId: string,
    event: {
      eventType: StreamEventType;
      message: string;
      data?: Record<string, unknown>;
      id?: string;
      timestamp?: string;
    },
  ): StreamChunk {
    const chunk: StreamChunk = {
      id: event.id ?? `chunk_${crypto.randomUUID().slice(0, 10)}`,
      orchestrationId,
      eventType: event.eventType,
      message: event.message,
      data: event.data ?? {},
      timestamp: event.timestamp ?? new Date().toISOString(),
    };

    // Store in recent buffer
    let buffer = this.recentChunks.get(orchestrationId);
    if (!buffer) {
      buffer = [];
      this.recentChunks.set(orchestrationId, buffer);
    }
    buffer.push(chunk);
    if (buffer.length > this.maxRecentChunks) {
      buffer.shift();
    }

    this.emitter.emit(this.getChannel(orchestrationId), chunk);
    return chunk;
  }

  /**
   * Subscribes a listener to live streaming events for an orchestration session.
   * Returns an unsubscription callback.
   */
  public subscribe(orchestrationId: string, listener: StreamListener): () => void {
    const channel = this.getChannel(orchestrationId);
    this.emitter.on(channel, listener);

    return () => {
      this.emitter.off(channel, listener);
    };
  }

  /**
   * Returns recent chunks emitted in-memory for the orchestration session.
   */
  public getRecentChunks(orchestrationId: string): StreamChunk[] {
    return [...(this.recentChunks.get(orchestrationId) ?? [])];
  }

  /**
   * Returns the count of active listeners for an orchestration session.
   */
  public getListenerCount(orchestrationId: string): number {
    return this.emitter.listenerCount(this.getChannel(orchestrationId));
  }

  /**
   * Cleans up buffer and listeners for a terminated orchestration session.
   */
  public cleanup(orchestrationId: string): void {
    this.recentChunks.delete(orchestrationId);
    this.emitter.removeAllListeners(this.getChannel(orchestrationId));
  }
}

export const executionStreamBroker = new ExecutionStreamBroker();

