import type { AgentExecutionProvider } from '../../orchestration/execution/execution.interface.js';
import { MockAgentExecutionProvider } from '../../orchestration/execution/mock-execution-provider.js';
import { OpenCodeExecutionProvider } from './runtime.executor.js';
import { OpenCodeClient } from '../opencode/opencode.client.js';
import { WorkspaceManager } from '../workspace/workspace.manager.js';
import type { RuntimeConfig } from '../runtime.config.js';
import type { PrismaClient } from '@prisma/client';
import { ExecutionMonitor } from './execution.monitor.js';

export interface ExecutionProviderFactoryOptions {
  config: RuntimeConfig;
  prismaClient?: PrismaClient;
  fetchFn?: typeof fetch;
}

export class ExecutionProviderFactory {
  public static create(options: ExecutionProviderFactoryOptions): AgentExecutionProvider {
    if (options.config.provider === 'OPENCODE') {
      const client = new OpenCodeClient({
        config: options.config,
        fetchFn: options.fetchFn,
      });

      const workspaceManager = new WorkspaceManager({
        baseWorkspaceRoot: options.config.workspaceRoot,
      });

      const monitor = new ExecutionMonitor({
        prismaClient: options.prismaClient,
        maxOutputBytes: options.config.maxOutputBytes,
      });

      return new OpenCodeExecutionProvider({
        client,
        workspaceManager,
        monitor,
      });
    }

    // Default to MOCK provider
    return new MockAgentExecutionProvider({
      simulatedDelayMs: 5,
    });
  }
}

