import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { HealthService } from './health.service.js';
import { healthResponseSchema, readinessResponseSchema } from './health.schema.js';
import { successResponse } from '../../common/utils/response.js';

export interface HealthRouteOptions {
  healthService?: HealthService;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const service = options.healthService ?? new HealthService();
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/health - Liveness probe
  server.get(
    '/health',
    {
      schema: {
        description: 'Liveness check returning application status, version, and uptime',
        tags: ['Health'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const data = service.getLiveness();
      return reply.status(200).send(successResponse(data));
    },
  );

  // GET /api/v1/health/ready - Readiness probe
  server.get(
    '/health/ready',
    {
      schema: {
        description: 'Readiness check verifying database and downstream dependency availability',
        tags: ['Health'],
        response: {
          200: readinessResponseSchema,
          503: readinessResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const { isReady, data } = await service.getReadiness();
      const statusCode = isReady ? 200 : 503;
      return reply.status(statusCode).send({
        success: isReady,
        data,
      });
    },
  );
};

