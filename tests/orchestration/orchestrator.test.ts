import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { Orchestrator } from '../../src/modules/orchestration/core/orchestrator.js';
import { MockAgentExecutionProvider } from '../../src/modules/orchestration/execution/mock-execution-provider.js';
import { AgentRole, AgentStatus, OrchestrationStatus, TaskPriority, TaskStatus } from '../../src/database/types.js';
import type { SwitchService } from '../../src/modules/switch/switch.service.js';
import { OrchestrationEventHandler } from '../../src/modules/orchestration/events/orchestration-event-handler.js';

describe('Orchestrator End-to-End Workflow', () => {
  const projectId = 'proj_e2e_01';

  const mockAgents = [
    {
      id: 'agent_coord',
      projectId,
      name: 'System Coordinator',
      role: AgentRole.COORDINATOR,
      status: AgentStatus.IDLE,
      capabilities: ['system_architecture', 'interface_design', 'task_planning', 'dependency_analysis'],
      configuration: {},
      assignedTasks: [],
    },
    {
      id: 'agent_dev',
      projectId,
      name: 'Senior Developer',
      role: AgentRole.DEVELOPER,
      status: AgentStatus.IDLE,
      capabilities: ['backend_development', 'code_implementation', 'database_design', 'debugging'],
      configuration: {},
      assignedTasks: [],
    },
    {
      id: 'agent_qa',
      projectId,
      name: 'QA Engineer',
      role: AgentRole.QA,
      status: AgentStatus.IDLE,
      capabilities: ['unit_testing', 'integration_testing', 'test_analysis', 'regression_testing'],
      configuration: {},
      assignedTasks: [],
    },
    {
      id: 'agent_reviewer',
      projectId,
      name: 'Code Reviewer',
      role: AgentRole.REVIEWER,
      status: AgentStatus.IDLE,
      capabilities: ['code_review', 'security_review', 'quality_assessment'],
      configuration: {},
      assignedTasks: [],
    },
  ];

  function createMockPrisma() {
    const orchestrations = new Map<string, any>();
    const tasks = new Map<string, any>();
    const events: any[] = [];
    const executions: any[] = [];
    const executionEvents: any[] = [];

    let taskIdCounter = 1;

    const mockPrisma: any = {
      project: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === projectId) {
            return { id: projectId, name: 'CrewFlow Test Project', workspaceId: 'ws_1' };
          }
          return null;
        }),
      },
      agent: {
        findMany: vi.fn().mockResolvedValue(mockAgents),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          return mockAgents.find(a => a.id === where.id) || null;
        }),
      },
      orchestration: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          orchestrations.set(data.id, { ...data, createdAt: new Date(), updatedAt: new Date() });
          return orchestrations.get(data.id);
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const existing = orchestrations.get(where.id);
          const updated = { ...existing, ...data, updatedAt: new Date() };
          orchestrations.set(where.id, updated);
          return updated;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          return orchestrations.get(where.id) || null;
        }),
      },
      orchestrationEvent: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          events.push(data);
          return data;
        }),
        findMany: vi.fn().mockImplementation(async () => events),
      },
      task: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const id = `task_${taskIdCounter++}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          tasks.set(id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const existing = tasks.get(where.id);
          const updated = { ...existing, ...data, updatedAt: new Date() };
          tasks.set(where.id, updated);
          return updated;
        }),
        findMany: vi.fn().mockImplementation(async () => Array.from(tasks.values())),
        findUnique: vi.fn().mockImplementation(async ({ where }) => tasks.get(where.id) || null),
      },
      taskDependency: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
        findMany: vi.fn().mockResolvedValue([]),
      },
      execution: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          executions.push(data);
          return data;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const idx = executions.findIndex(e => e.id === where.id);
          if (idx !== -1) {
            executions[idx] = { ...executions[idx], ...data };
            return executions[idx];
          }
          return data;
        }),
      },
      executionEvent: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          executionEvents.push(data);
          return data;
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'conv_switch_100',
          externalRoomId: '!switch_room_100:server',
        }),
      },
    };

    mockPrisma.$transaction = vi.fn().mockImplementation(async callback => {
      return callback(mockPrisma);
    });

    return {
      prisma: mockPrisma as PrismaClient,
      orchestrations,
      tasks,
      events,
      executions,
      executionEvents,
    };
  }

  it('should plan, assign agents, schedule DAG, and execute handoff loop to completion', async () => {
    const { prisma, orchestrations, events } = createMockPrisma();

    const mockSwitchService = {
      sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_1' }),
    } as unknown as SwitchService;

    const eventHandler = new OrchestrationEventHandler({
      prismaClient: prisma,
      switchService: mockSwitchService,
    });

    const orchestrator = new Orchestrator({
      prismaClient: prisma,
      eventHandler,
      executionProvider: new MockAgentExecutionProvider({
        simulatedDelayMs: 0,
      }),
    });

    const summary = await orchestrator.orchestrate({
      projectId,
      objective: 'Implement OAuth2 Google authentication login and token refresh flow',
      initiatorUserId: 'user_admin',
      conversationId: 'conv_switch_100',
      autoExecute: true,
    });

    // 1. Verify summary output
    expect(summary.orchestrationId).toBeDefined();
    expect(summary.status).toBe(OrchestrationStatus.COMPLETED);
    expect(summary.persistedTaskIds.length).toBeGreaterThanOrEqual(3);
    expect(summary.scheduling.completedTaskIds.length).toBe(summary.persistedTaskIds.length);
    expect(summary.scheduling.failedTaskIds.length).toBe(0);

    // 2. Verify state progression in database
    const finalRecord = orchestrations.get(summary.orchestrationId);
    expect(finalRecord).toBeDefined();
    expect(finalRecord.status).toBe(OrchestrationStatus.COMPLETED);

    // 3. Verify that domain events were recorded
    const eventTypes = events.map(e => e.eventType);
    expect(eventTypes).toContain('REQUEST_ACCEPTED');
    expect(eventTypes).toContain('PLANNING_STARTED');
    expect(eventTypes).toContain('PLAN_READY');
    expect(eventTypes).toContain('EXECUTION_SCHEDULED');
    expect(eventTypes).toContain('EXECUTION_STARTED');
    expect(eventTypes).toContain('ORCHESTRATION_COMPLETED');

    // 4. Verify Switch room notification out-of-band delivery
    expect(mockSwitchService.sendMessage).toHaveBeenCalled();
  });

  it('should halt execution and mark orchestration FAILED when an upstream task fails', async () => {
    const { prisma, orchestrations } = createMockPrisma();

    const orchestrator = new Orchestrator({
      prismaClient: prisma,
      executionProvider: new MockAgentExecutionProvider({
        simulatedDelayMs: 0,
        shouldFailAll: true,
      }),
    });

    const summary = await orchestrator.orchestrate({
      projectId,
      objective: 'Implement OAuth2 Google authentication login and token refresh flow',
      autoExecute: true,
    });

    expect(summary.status).toBe(OrchestrationStatus.FAILED);
    expect(summary.scheduling.failedTaskIds.length).toBeGreaterThan(0);

    const record = orchestrations.get(summary.orchestrationId);
    expect(record.status).toBe(OrchestrationStatus.FAILED);
  });
});
