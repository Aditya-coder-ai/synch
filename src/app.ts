import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { env, parseCorsOrigins } from './config/env.js';
import { errorHandler, notFoundHandler } from './common/errors/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import type { HealthService } from './modules/health/health.service.js';
import { switchModule } from './modules/switch/switch.module.js';
import type { SwitchService } from './modules/switch/switch.service.js';
import { orchestrationModule } from './modules/orchestration/orchestration.module.js';
import type { OrchestrationService } from './modules/orchestration/core/orchestration.service.js';
import { runtimeModule, type RuntimeModuleOptions } from './modules/runtime/runtime.module.js';
import { memoryModule, type MemoryModuleOptions } from './modules/memory/memory.module.js';

export interface BuildAppOptions {
  healthService?: HealthService;
  switchService?: SwitchService;
  orchestrationService?: OrchestrationService;
  runtimeModuleOptions?: RuntimeModuleOptions;
  memoryModuleOptions?: MemoryModuleOptions;
  logger?: boolean | object;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.headers["x-connection-id"]',
          'req.body.password',
          'req.body.token',
          'req.body.secret',
          'req.body.apiKey',
          '*.password',
          '*.token',
          '*.secret',
          '*.apiKey',
        ],
        censor: '[REDACTED]',
      },
    },
    bodyLimit: env.BODY_LIMIT,
  });

  // Configure Zod Type Provider compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security headers with Helmet
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  // Cross-Origin Resource Sharing
  await app.register(cors, {
    origin: parseCorsOrigins(env.CORS_ORIGIN),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Connection-Id'],
    credentials: true,
  });

  // OpenAPI / Swagger Documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'CrewFlow Backend API',
        description:
          'REST API for CrewFlow: Multi-agent AI collaboration and execution platform connecting humans, specialist agents, Switch collaboration rooms, and OpenCode runtimes.',
        version: env.APP_VERSION,
      },
      servers: [
        {
          url: `http://${env.HOST}:${env.PORT}`,
          description: `${env.NODE_ENV} environment server`,
        },
      ],
      tags: [
        {
          name: 'Health',
          description: 'Liveness and readiness health monitoring endpoints',
        },
        {
          name: 'Integrations - Switch',
          description: 'Switch Agent Protocol integration and room collaboration endpoints',
        },
        {
          name: 'Orchestration',
          description: 'Autonomous multi-agent orchestration, planning, scheduling, and execution',
        },
        {
          name: 'Runtime',
          description: 'OpenCode agent execution runtime and workspace environments',
        },
        {
          name: 'Memory',
          description: 'Shared intelligence, semantic memory retrieval, and context construction',
        },
      ],
    },
    transform: jsonSchemaTransform,
  });

  // Swagger UI
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: header => header,
  });

  // Centralized Error and 404 Handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Register API modules under /api/v1
  await app.register(
    async v1 => {
      await v1.register(healthRoutes, {
        healthService: options.healthService,
      });

      await v1.register(switchModule, {
        switchService: options.switchService,
      });

      await v1.register(orchestrationModule, {
        orchestrationService: options.orchestrationService,
        switchService: options.switchService,
      });

      await v1.register(runtimeModule, options.runtimeModuleOptions ?? {});

      await v1.register(memoryModule, options.memoryModuleOptions ?? {});
    },
    { prefix: '/api/v1' },
  );

  // Root redirect to docs or health summary
  app.get('/', async (_request, reply) => {
    return reply.redirect('/docs');
  });

  return app;
}
