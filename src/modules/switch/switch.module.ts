import type { FastifyPluginAsync } from 'fastify';
import { parseSwitchConfig, type SwitchConfig } from './switch.config.js';
import { SwitchService } from './switch.service.js';
import { switchRoutes } from './switch.routes.js';
import type { PrismaClient } from '@prisma/client';

export interface SwitchModuleOptions {
  config?: SwitchConfig;
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
}

export const switchModule: FastifyPluginAsync<SwitchModuleOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const config = options.config ?? parseSwitchConfig();
  const switchService =
    options.switchService ??
    new SwitchService({
      config,
      prismaClient: options.prismaClient,
    });

  // Start background connection if enabled
  if (config.enabled) {
    fastify.log.info({ agentId: config.agentId }, 'Initializing Switch integration connection');
    void switchService.start().catch(err => {
      fastify.log.error({ err }, 'Failed to initialize Switch connection');
    });
  }

  // Gracefully disconnect Switch on Fastify shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Shutting down Switch integration');
    await switchService.stop();
  });

  // Register routes under /api/v1/integrations/switch
  await fastify.register(switchRoutes, {
    prefix: '/integrations/switch',
    switchService,
  });
};
