import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { Orchestrator } from '../../src/modules/orchestration/core/orchestrator.js';
import { OrchestrationEventHandler } from '../../src/modules/orchestration/events/orchestration-event-handler.js';
import { ContextBuilder } from '../../src/modules/memory/context/context.builder.js';
import { MemoryRetriever } from '../../src/modules/memory/retrieval/memory.retriever.js';
import { MemoryRepository } from '../../src/modules/memory/storage/memory.repository.js';
import { DeterministicMemoryExtractor } from '../../src/modules/memory/extraction/memory.extractor.js';
import { MemoryService } from '../../src/modules/memory/storage/memory.service.js';
import { OpenCodeExecutionProvider } from '../../src/modules/runtime/execution/runtime.executor.js';
import { OpenCodeClient } from '../../src/modules/runtime/opencode/opencode.client.js';
import { WorkspaceManager } from '../../src/modules/runtime/workspace/workspace.manager.js';
import { parseRuntimeConfig } from '../../src/modules/runtime/runtime.config.js';
import { AgentRole, AgentStatus, MemoryCategory, OrchestrationStatus } from '../../src/database/types.js';
import type { SwitchService } from '../../src/modules/switch/switch.service.js';

describe('Phase 5 + Phase 6 Cross-Module Integration E2E', () => {
  const projectId = 'proj_integration_01';

  function createIntegrationPrisma() {
    const memoryStore = new Map<string, any>();
    const orchestrationStore = new Map<string, any>();
    const taskStore = new Map<string, any>();
    const executionStore: any[] = [];
    const eventStore: any[] = [];
    let idCounter = 1;

    const mockPrisma: any = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: projectId,
          name: 'Integration E2E Project',
          workspaceId: 'ws_integration',
        }),
      },
      agent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'agent_coord_01',
            projectId,
            name: 'System Coordinator',
            role: AgentRole.COORDINATOR,
            status: AgentStatus.IDLE,
            capabilities: ['system_architecture', 'interface_design', 'task_planning', 'dependency_analysis'],
            configuration: {},
            assignedTasks: [],
          },
          {
            id: 'agent_dev_01',
            projectId,
            name: 'Senior Developer',
            role: AgentRole.DEVELOPER,
            status: AgentStatus.IDLE,
            capabilities: ['backend_development', 'code_implementation', 'database_design', 'debugging'],
            configuration: {},
            assignedTasks: [],
          },
          {
            id: 'agent_qa_01',
            projectId,
            name: 'QA Engineer',
            role: AgentRole.QA,
            status: AgentStatus.IDLE,
            capabilities: ['unit_testing', 'integration_testing', 'test_analysis', 'regression_testing'],
            configuration: {},
            assignedTasks: [],
          },
          {
            id: 'agent_rev_01',
            projectId,
            name: 'Security Reviewer',
            role: AgentRole.REVIEWER,
            status: AgentStatus.IDLE,
            capabilities: ['code_review', 'security_review', 'quality_assessment'],
            configuration: {},
            assignedTasks: [],
          },
        ]),
      },
      orchestration: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          orchestrationStore.set(data.id, { ...data, createdAt: new Date() });
          return orchestrationStore.get(data.id);
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const ex = orchestrationStore.get(where.id);
          const updated = { ...ex, ...data, updatedAt: new Date() };
          orchestrationStore.set(where.id, updated);
          return updated;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => orchestrationStore.get(where.id)),
      },
      orchestrationEvent: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          eventStore.push(data);
          return data;
        }),
      },
      task: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const id = `task_${idCounter++}`;
          const rec = { id, ...data, createdAt: new Date() };
          taskStore.set(id, rec);
          return rec;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const ex = taskStore.get(where.id);
          const updated = { ...ex, ...data, updatedAt: new Date() };
          taskStore.set(where.id, updated);
          return updated;
        }),
        findMany: vi.fn().mockImplementation(async () => Array.from(taskStore.values())),
        findUnique: vi.fn().mockImplementation(async ({ where }) => taskStore.get(where.id)),
      },
      taskDependency: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
        findMany: vi.fn().mockResolvedValue([]),
      },
      execution: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          executionStore.push(data);
          return data;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const idx = executionStore.findIndex(e => e.id === where.id);
          if (idx !== -1) {
            executionStore[idx] = { ...executionStore[idx], ...data };
            return executionStore[idx];
          }
          return data;
        }),
      },
      executionEvent: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
      memoryEntry: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const id = `mem_${idCounter++}`;
          const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          memoryStore.set(id, rec);
          return rec;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          return memoryStore.get(where.id) || null;
        }),
        findMany: vi.fn().mockImplementation(async ({ where }) => {
          return Array.from(memoryStore.values()).filter(m => m.projectId === where.projectId);
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const ex = memoryStore.get(where.id);
          const updated = { ...ex, ...data, updatedAt: new Date() };
          memoryStore.set(where.id, updated);
          return updated;
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'conv_switch_e2e',
          externalRoomId: '!switch_room_e2e:server',
        }),
      },
    };

    mockPrisma.$transaction = vi.fn().mockImplementation(async cb => cb(mockPrisma));

    return {
      prisma: mockPrisma as PrismaClient,
      memoryStore,
      orchestrationStore,
      taskStore,
    };
  }

  it('should execute end-to-end pipeline: memory context injection -> runtime execution -> evidence verification -> memory extraction & persistence -> Switch notification', async () => {
    const { prisma, memoryStore } = createIntegrationPrisma();

    // 1. Seed historical memory into Phase 6 Memory Store
    const memoryRepo = new MemoryRepository({ prismaClient: prisma });
    const memoryService = new MemoryService({ repository: memoryRepo });
    const memoryRetriever = new MemoryRetriever({ repository: memoryRepo });
    const contextBuilder = new ContextBuilder({ retriever: memoryRetriever });
    const memoryExtractor = new DeterministicMemoryExtractor();

    await memoryService.storeMemory({
      projectId,
      category: MemoryCategory.DECISION,
      title: 'PostgreSQL Relational Schema Decision',
      content: 'All entity relations must use normalized PostgreSQL tables with foreign key cascades.',
      sourceType: 'PROJECT_DECISION',
      metadata: { verified: true, confidence: 1.0 },
    });

    await memoryService.storeMemory({
      projectId,
      category: MemoryCategory.TECHNICAL_KNOWLEDGE,
      title: 'Fastify Zod TypeProvider Standard',
      content: 'All route schemas must be defined with Zod and compiled with serializerCompiler.',
      sourceType: 'TECHNICAL_SPEC',
      metadata: { verified: true, confidence: 0.9 },
    });

    // 2. Set up Phase 5 OpenCode Runtime with mock client
    const mockOpenCodeClient = {
      checkHealth: vi.fn().mockResolvedValue({ healthy: true, version: '1.19.5' }),
      createSession: vi.fn().mockResolvedValue({ id: 'ses_e2e_99', title: 'Session E2E' }),
      sendMessage: vi.fn().mockResolvedValue({ reply: 'Task executed with strict types' }),
      getDiff: vi.fn().mockResolvedValue([
        { path: 'src/modules/billing/invoice.service.ts', status: 'created' },
      ]),
      abortSession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as OpenCodeClient;

    const workspaceManager = new WorkspaceManager({
      baseWorkspaceRoot: './test-workspaces',
    });

    const runtimeProvider = new OpenCodeExecutionProvider({
      client: mockOpenCodeClient,
      workspaceManager,
      prismaClient: prisma,
    });

    // 3. Set up Switch Room notification bridge
    const mockSwitchService = {
      sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_switch_e2e' }),
    } as unknown as SwitchService;

    const eventHandler = new OrchestrationEventHandler({
      prismaClient: prisma,
      switchService: mockSwitchService,
    });

    // 4. Set up Phase 4 Orchestrator
    const orchestrator = new Orchestrator({
      prismaClient: prisma,
      eventHandler,
      executionProvider: runtimeProvider,
    });

    // 5. Pre-execution context assembly: Test context builder
    const builtContext = await contextBuilder.buildContext(
      projectId,
      'task_pre',
      'Implement Billing Invoice Generation',
      ['PostgreSQL', 'Zod', 'schema'],
    );

    expect(builtContext.decisions.length).toBeGreaterThan(0);
    expect(builtContext.decisions[0].title).toBe('PostgreSQL Relational Schema Decision');
    expect(builtContext.technicalKnowledge.length).toBeGreaterThan(0);

    // 6. Execute orchestration
    const summary = await orchestrator.orchestrate({
      projectId,
      objective: 'Implement Billing Invoice Generation and PDF export service',
      initiatorUserId: 'user_admin',
      conversationId: 'conv_switch_e2e',
      context: {
        memoryContext: builtContext,
      },
      autoExecute: true,
    });

    expect(summary.status).toBe(OrchestrationStatus.COMPLETED);
    expect(summary.persistedTaskIds.length).toBeGreaterThanOrEqual(3);

    // 7. Verify OpenCode Runtime interactions
    expect(mockOpenCodeClient.createSession).toHaveBeenCalled();
    expect(mockOpenCodeClient.sendMessage).toHaveBeenCalled();
    expect(mockOpenCodeClient.getDiff).toHaveBeenCalled();

    // 8. Verify post-execution memory extraction from verified task outcomes
    const extractedMemories = await memoryExtractor.extractFromTaskOutcome({
      projectId,
      taskId: summary.persistedTaskIds[0],
      taskTitle: 'Implement Billing Invoice Generation',
      filesModified: ['src/modules/billing/invoice.service.ts'],
      summary: 'Invoice generation verified with PDF export schema.',
      verified: true,
      notes: [
        'Lesson learned: Pre-calculate invoice line item taxes to avoid floating point precision rounding errors.',
      ],
    });

    expect(extractedMemories.length).toBeGreaterThanOrEqual(2);

    for (const mem of extractedMemories) {
      await memoryService.storeMemory(mem);
    }

    // Verify memories were persisted
    const allProjectMemories = Array.from(memoryStore.values());
    expect(allProjectMemories.length).toBeGreaterThanOrEqual(4);
    expect(
      allProjectMemories.some(m => m.title.includes('Verified Implementation')),
    ).toBe(true);

    // 9. Verify Switch notifications were delivered
    expect(mockSwitchService.sendMessage).toHaveBeenCalled();
  });
});
