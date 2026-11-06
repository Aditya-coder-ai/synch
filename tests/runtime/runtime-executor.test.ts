import { describe, it, expect, vi } from 'vitest';
import { OpenCodeExecutionProvider } from '../../src/modules/runtime/execution/runtime.executor.js';
import { OpenCodeClient } from '../../src/modules/runtime/opencode/opencode.client.js';
import { WorkspaceManager } from '../../src/modules/runtime/workspace/workspace.manager.js';
import { ExecutionProviderFactory } from '../../src/modules/runtime/execution/execution.factory.js';
import { parseRuntimeConfig } from '../../src/modules/runtime/runtime.config.js';
import { ExecutionStatus } from '../../src/database/types.js';
import type { AgentExecutionInput } from '../../src/modules/orchestration/execution/execution.interface.js';

describe('OpenCode Runtime Executor & Provider Switching', () => {
  const executionInput: AgentExecutionInput = {
    executionId: 'exec_rt_01',
    taskId: 'task_rt_01',
    agentId: 'agent_dev_01',
    projectId: 'proj_rt_01',
    title: 'Implement User Registration Endpoint',
    description: 'Create POST /api/v1/auth/register with Zod validation',
    requiredCapabilities: ['code_implementation', 'backend_development'],
  };

  const mockPrisma = {
    executionEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    execution: {
      update: vi.fn().mockResolvedValue({}),
    },
  } as any;

  it('should execute task on OpenCode runtime, verify evidence, and report SUCCEEDED', async () => {
    const mockClient = {
      checkHealth: vi.fn().mockResolvedValue({ healthy: true, version: '1.19.5' }),
      createSession: vi.fn().mockResolvedValue({ id: 'ses_rt_100', title: 'Test Session' }),
      sendMessage: vi.fn().mockResolvedValue({ reply: 'Code created successfully' }),
      getDiff: vi.fn().mockResolvedValue([
        { path: 'src/modules/auth/register.ts', status: 'created' },
      ]),
      abortSession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as OpenCodeClient;

    const workspaceManager = new WorkspaceManager({
      baseWorkspaceRoot: './test-workspaces',
    });

    const executor = new OpenCodeExecutionProvider({
      client: mockClient,
      workspaceManager,
      prismaClient: mockPrisma,
    });

    const result = await executor.execute(executionInput);

    expect(result.status).toBe(ExecutionStatus.SUCCEEDED);
    expect(result.executionId).toBe('exec_rt_01');
    expect(result.events.some(e => e.eventType === 'RUNTIME_CONNECTED')).toBe(true);
    expect(result.events.some(e => e.eventType === 'SESSION_CREATED')).toBe(true);
    expect(result.events.some(e => e.eventType === 'RESULT_VERIFIED')).toBe(true);
    expect(mockClient.createSession).toHaveBeenCalled();
    expect(mockClient.sendMessage).toHaveBeenCalled();
  });

  it('should fail with explicit error when OpenCode server is unreachable and never silently fall back to mock', async () => {
    const mockClient = {
      checkHealth: vi.fn().mockRejectedValue(new Error('Connection refused: 127.0.0.1:4096')),
    } as unknown as OpenCodeClient;

    const workspaceManager = new WorkspaceManager({
      baseWorkspaceRoot: './test-workspaces',
    });

    const executor = new OpenCodeExecutionProvider({
      client: mockClient,
      workspaceManager,
      prismaClient: mockPrisma,
    });

    const result = await executor.execute(executionInput);

    expect(result.status).toBe(ExecutionStatus.FAILED);
    expect(result.error).toContain('Server unavailable');
    expect(result.events.some(e => e.eventType === 'RUNTIME_UNAVAILABLE')).toBe(true);
  });

  it('should abort and mark execution CANCELLED on cancel request', async () => {
    const mockClient = {
      checkHealth: vi.fn().mockResolvedValue({ healthy: true, version: '1.19.5' }),
      createSession: vi.fn().mockResolvedValue({ id: 'ses_rt_101', title: 'Test' }),
      sendMessage: vi.fn().mockResolvedValue({}),
      getDiff: vi.fn().mockResolvedValue([]),
      abortSession: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as OpenCodeClient;

    const workspaceManager = new WorkspaceManager({
      baseWorkspaceRoot: './test-workspaces',
    });

    const executor = new OpenCodeExecutionProvider({
      client: mockClient,
      workspaceManager,
      prismaClient: mockPrisma,
    });

    await executor.cancel('exec_rt_01');
    const status = await executor.getStatus('exec_rt_01');
    expect(status).toBe(ExecutionStatus.CANCELLED);
  });

  it('ExecutionProviderFactory should select MOCK vs OPENCODE based on configuration', () => {
    const mockProvider = ExecutionProviderFactory.create({
      config: parseRuntimeConfig({ provider: 'MOCK' }),
    });
    expect(mockProvider.constructor.name).toBe('MockAgentExecutionProvider');

    const openCodeProvider = ExecutionProviderFactory.create({
      config: parseRuntimeConfig({ provider: 'OPENCODE' }),
    });
    expect(openCodeProvider.constructor.name).toBe('OpenCodeExecutionProvider');
  });
});
