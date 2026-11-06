import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { OrchestrationService } from '../../src/modules/orchestration/core/orchestration.service.js';
import { OrchestrationStatus } from '../../src/database/types.js';
import { OrchestrationNotFoundError } from '../../src/modules/orchestration/core/orchestration.errors.js';

describe('Orchestration Routes', () => {
  let mockOrchestrationService: Partial<OrchestrationService>;

  beforeEach(() => {
    mockOrchestrationService = {
      startOrchestration: vi.fn().mockResolvedValue({
        orchestrationId: 'orch_test_123',
        projectId: 'proj_test',
        status: OrchestrationStatus.COMPLETED,
        objective: 'Implement user login with OAuth2',
        persistedTaskIds: ['task_1', 'task_2'],
        assignments: [],
        scheduling: {
          scheduledTaskIds: ['task_1', 'task_2'],
          blockedTaskIds: [],
          completedTaskIds: ['task_1', 'task_2'],
          failedTaskIds: [],
          inProgressTaskIds: [],
        },
      }),
      getOrchestration: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'orch_test_123') {
          return {
            id: 'orch_test_123',
            projectId: 'proj_test',
            status: OrchestrationStatus.COMPLETED,
            objective: 'Implement user login with OAuth2',
            tasks: [
              { id: 'task_1', title: 'Task 1', status: 'COMPLETED' },
              { id: 'task_2', title: 'Task 2', status: 'COMPLETED' },
            ],
            events: [],
          };
        }
        throw new OrchestrationNotFoundError(`Orchestration '${id}' not found`);
      }),
      getOrchestrationEvents: vi.fn().mockResolvedValue([
        {
          id: 'evt_1',
          orchestrationId: 'orch_test_123',
          eventType: 'REQUEST_ACCEPTED',
          message: 'Request accepted',
          createdAt: new Date().toISOString(),
        },
      ]),
      cancelOrchestration: vi.fn().mockResolvedValue({
        id: 'orch_test_123',
        status: OrchestrationStatus.CANCELLED,
      }),
    };
  });

  it('POST /api/v1/orchestrations should initiate orchestration and return 201', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orchestrations',
      payload: {
        projectId: 'proj_test',
        objective: 'Implement user login with OAuth2',
        autoExecute: true,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.orchestrationId).toBe('orch_test_123');
    expect(mockOrchestrationService.startOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj_test',
        objective: 'Implement user login with OAuth2',
      }),
    );
  });

  it('POST /api/v1/orchestrations should return 400 when body is invalid', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orchestrations',
      payload: {
        projectId: 'proj_test',
        objective: 'hi', // too short, min 5 characters required by schema
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/orchestrations/:id should return orchestration details with 200', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orchestrations/orch_test_123',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('orch_test_123');
    expect(body.data.tasks).toHaveLength(2);
  });

  it('GET /api/v1/orchestrations/:id should return 404 when not found', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orchestrations/non_existent_orch',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/orchestrations/:id/events should return chronological event audit log', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orchestrations/orch_test_123/events',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].eventType).toBe('REQUEST_ACCEPTED');
  });

  it('POST /api/v1/orchestrations/:id/cancel should cancel in-flight orchestration', async () => {
    const app = await buildApp({
      orchestrationService: mockOrchestrationService as OrchestrationService,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orchestrations/orch_test_123/cancel',
      payload: {
        reason: 'User stopped execution manually',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe(OrchestrationStatus.CANCELLED);
    expect(mockOrchestrationService.cancelOrchestration).toHaveBeenCalledWith(
      'orch_test_123',
      'User stopped execution manually',
    );
  });
});

