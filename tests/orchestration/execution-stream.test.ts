import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionStreamBroker } from '../../src/modules/orchestration/stream/stream.broker.js';
import {
  OrchestrationStreamService,
} from '../../src/modules/orchestration/stream/stream.service.js';
import { StreamEventType, type StreamChunk } from '../../src/modules/orchestration/stream/stream.types.js';
import { buildApp } from '../../src/app.js';
import { OrchestrationNotFoundError } from '../../src/modules/orchestration/core/orchestration.errors.js';

describe('ExecutionStreamBroker', () => {
  let broker: ExecutionStreamBroker;

  beforeEach(() => {
    broker = new ExecutionStreamBroker({ maxRecentChunks: 3 });
  });

  it('publishes and delivers chunks to active subscribers', () => {
    const received: StreamChunk[] = [];
    const unsubscribe = broker.subscribe('orch_1', (chunk) => {
      received.push(chunk);
    });

    broker.publish('orch_1', {
      eventType: StreamEventType.TASK_STATUS,
      message: 'Task 1 running',
      data: { taskId: 'task_1', status: 'RUNNING' },
    });

    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe(StreamEventType.TASK_STATUS);
    expect(received[0].message).toBe('Task 1 running');
    expect(received[0].data.status).toBe('RUNNING');

    unsubscribe();

    // After unsubscribe, further events are not delivered
    broker.publish('orch_1', {
      eventType: StreamEventType.TASK_STATUS,
      message: 'Task 1 completed',
      data: { taskId: 'task_1', status: 'COMPLETED' },
    });

    expect(received).toHaveLength(1);
  });

  it('maintains a bounded in-memory buffer of recent chunks', () => {
    for (let i = 1; i <= 5; i++) {
      broker.publish('orch_2', {
        eventType: StreamEventType.RUNTIME_STDOUT,
        message: `Log line ${i}`,
      });
    }

    const recent = broker.getRecentChunks('orch_2');
    expect(recent).toHaveLength(3); // Capped at maxRecentChunks = 3
    expect(recent[0].message).toBe('Log line 3');
    expect(recent[2].message).toBe('Log line 5');
  });

  it('cleans up buffers and listeners on cleanup()', () => {
    broker.subscribe('orch_3', () => {});
    expect(broker.getListenerCount('orch_3')).toBe(1);

    broker.cleanup('orch_3');
    expect(broker.getListenerCount('orch_3')).toBe(0);
    expect(broker.getRecentChunks('orch_3')).toHaveLength(0);
  });
});

describe('OrchestrationStreamService', () => {
  let mockPrisma: any;
  let broker: ExecutionStreamBroker;
  let service: OrchestrationStreamService;

  beforeEach(() => {
    broker = new ExecutionStreamBroker();
    mockPrisma = {
      orchestration: {
        findUnique: vi.fn(),
      },
    };
    service = new OrchestrationStreamService({
      prismaClient: mockPrisma,
      broker,
      heartbeatIntervalMs: 50,
    });
  });

  it('formats SSE frames according to the specification', () => {
    const chunk: StreamChunk = {
      id: 'chunk_123',
      orchestrationId: 'orch_test',
      eventType: StreamEventType.RUNTIME_STDOUT,
      message: 'Hello runtime',
      data: { stream: 'stdout' },
      timestamp: '2026-11-07T12:00:00.000Z',
    };

    const sse = service.formatSSE(chunk);
    expect(sse).toContain('id: chunk_123\n');
    expect(sse).toContain(`event: ${StreamEventType.RUNTIME_STDOUT}\n`);
    expect(sse).toContain('"orchestrationId":"orch_test"');
    expect(sse.endsWith('\n\n')).toBe(true);
  });

  it('formats ping keep-alive comment frames', () => {
    const ping = service.formatPing();
    expect(ping.startsWith(':keep-alive')).toBe(true);
    expect(ping.endsWith('\n\n')).toBe(true);
  });

  it('retrieves backlog from database and deduplicates with memory buffer', async () => {
    mockPrisma.orchestration.findUnique.mockResolvedValue({
      id: 'orch_backlog',
      events: [
        {
          id: 'evt_1',
          orchestrationId: 'orch_backlog',
          eventType: 'REQUEST_ACCEPTED',
          message: 'Objective accepted',
          payload: {},
          createdAt: new Date('2026-11-07T10:00:00.000Z'),
        },
      ],
    });

    // In-memory has evt_1 (already in DB) and live evt_2
    broker.publish('orch_backlog', {
      id: 'evt_1',
      eventType: StreamEventType.ORCHESTRATION_EVENT,
      message: 'Duplicate in memory',
    });
    broker.publish('orch_backlog', {
      id: 'evt_2',
      eventType: StreamEventType.RUNTIME_STDOUT,
      message: 'New live stdout',
    });

    const backlog = await service.getBacklog('orch_backlog');
    expect(backlog.chunks).toHaveLength(2);
    expect(backlog.chunks[0].id).toBe('evt_1');
    expect(backlog.chunks[1].id).toBe('evt_2');
  });

  it('throws OrchestrationNotFoundError when session does not exist', async () => {
    mockPrisma.orchestration.findUnique.mockResolvedValue(null);

    await expect(service.getBacklog('orch_nonexistent')).rejects.toThrow(
      OrchestrationNotFoundError,
    );
  });
});

describe('GET /api/v1/orchestrations/:id/stream Route', () => {
  it('returns 404 when streaming a nonexistent orchestration', async () => {
    const mockService = {
      handleSSEStream: vi.fn().mockImplementation(async () => {
        throw new OrchestrationNotFoundError('orch_unknown');
      }),
    };

    const app = await buildApp({
      logger: false,
      orchestrationStreamService: mockService as any,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orchestrations/orch_unknown/stream',
    });

    expect(response.statusCode).toBe(404);
  });

  it('streams initial connection frame and backlog for completed orchestration', async () => {
    const broker = new ExecutionStreamBroker();
    const mockPrisma = {
      orchestration: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'orch_live_stream',
          status: 'COMPLETED',
          events: [
            {
              id: 'evt_init',
              orchestrationId: 'orch_live_stream',
              eventType: 'PLAN_READY',
              message: 'Plan ready with 2 tasks',
              payload: {},
              createdAt: new Date(),
            },
          ],
        }),
      },
    };

    const streamService = new OrchestrationStreamService({
      prismaClient: mockPrisma as any,
      broker,
      heartbeatIntervalMs: 60000,
    });

    const app = await buildApp({
      logger: false,
      orchestrationStreamService: streamService,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orchestrations/orch_live_stream/stream',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/event-stream');
    expect(response.body).toContain('event: connected');
    expect(response.body).toContain('event: PLAN_READY');
  });
});
