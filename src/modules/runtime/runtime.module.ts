import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { parseRuntimeConfig, type RuntimeConfig } from './runtime.config.js';
import { OpenCodeClient } from './opencode/opencode.client.js';
import { ExecutionProviderFactory } from './execution/execution.factory.js';
import type { AgentExecutionProvider } from '../orchestration/execution/execution.interface.js';

export interface RuntimeModuleOptions {
  config?: RuntimeConfig;
  prismaClient?: PrismaClient;
  provider?: AgentExecutionProvider;
}

export const runtimeModule: FastifyPluginAsync<RuntimeModuleOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const config = options.config ?? parseRuntimeConfig();
  const client = new OpenCodeClient({ config });

  const provider =
    options.provider ??
    ExecutionProviderFactory.create({
      config,
      prismaClient: options.prismaClient,
    });

  // GET /api/v1/runtime/status
  fastify.get('/runtime/status', async () => {
    return {
      success: true,
      data: {
        provider: config.provider,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
        workspaceRoot: config.workspaceRoot,
      },
    };
  });

  // GET /api/v1/runtime/health
  fastify.get('/runtime/health', async (_request, reply) => {
    if (config.provider === 'MOCK') {
      return {
        success: true,
        data: {
          healthy: true,
          mode: 'MOCK',
          message: 'Mock execution provider active and operational',
        },
      };
    }

    try {
      const health = await client.checkHealth();
      return {
        success: true,
        data: {
          healthy: health.healthy,
          mode: 'OPENCODE',
          version: health.version,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return reply.status(503).send({
        success: false,
        error: {
          code: 'OPENCODE_UNAVAILABLE',
          message: `OpenCode runtime unreachable: ${errorMsg}`,
        },
      });
    }
  });

  // Decorate fastify with execution provider for downstream access
  fastify.decorate('executionProvider', provider);
};
