import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { SwitchService } from '../switch/switch.service.js';
import { OrchestrationService } from './core/orchestration.service.js';
import { Orchestrator } from './core/orchestrator.js';
import { OrchestrationEventHandler } from './events/orchestration-event-handler.js';
import { orchestrationRoutes } from './orchestration.routes.js';

export interface OrchestrationModuleOptions {
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
  orchestrationService?: OrchestrationService;
}

export const orchestrationModule: FastifyPluginAsync<OrchestrationModuleOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const eventHandler = new OrchestrationEventHandler({
    prismaClient: options.prismaClient,
    switchService: options.switchService,
  });

  const orchestrator = new Orchestrator({
    prismaClient: options.prismaClient,
    eventHandler,
  });

  const orchestrationService =
    options.orchestrationService ??
    new OrchestrationService({
      prismaClient: options.prismaClient,
      orchestrator,
    });

  await fastify.register(orchestrationRoutes, {
    prefix: '/orchestrations',
    orchestrationService,
  });
};
