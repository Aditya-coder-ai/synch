import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { orchestrationRequestSchema } from './planner/planner.schemas.js';
import { OrchestrationService } from './core/orchestration.service.js';
import {
  OrchestrationStreamService,
  orchestrationStreamService,
} from './stream/stream.service.js';

export interface OrchestrationRoutesOptions {
  orchestrationService?: OrchestrationService;
  streamService?: OrchestrationStreamService;
}

export const orchestrationRoutes: FastifyPluginAsync<OrchestrationRoutesOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = options.orchestrationService ?? new OrchestrationService();
  const streamService = options.streamService ?? orchestrationStreamService;

  // POST /api/v1/orchestrations - Start a new orchestration run
  app.post(
    '',
    {
      schema: {
        summary: 'Initiate Agent Orchestration',
        description:
          'Accepts a human task request, generates a structured execution plan, selects capable agents, wires dependencies, and coordinates execution.',
        tags: ['Orchestration'],
        body: orchestrationRequestSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    async (request, reply) => {
      const summary = await service.startOrchestration(request.body);
      return reply.status(201).send({
        success: true,
        data: summary as unknown as Record<string, unknown>,
      });
    },
  );

  // GET /api/v1/orchestrations/:id - Retrieve orchestration details
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Orchestration Session',
        description: 'Retrieves current status, plan, assigned tasks, and execution events for a session.',
        tags: ['Orchestration'],
        params: z.object({
          id: z.string().trim().min(1),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    async (request, reply) => {
      const session = await service.getOrchestration(request.params.id);
      return reply.send({
        success: true,
        data: session as unknown as Record<string, unknown>,
      });
    },
  );

  // GET /api/v1/orchestrations/:id/events - Retrieve event audit log
  app.get(
    '/:id/events',
    {
      schema: {
        summary: 'Get Orchestration Events',
        description: 'Retrieves the immutable audit log of orchestration and agent execution events.',
        tags: ['Orchestration'],
        params: z.object({
          id: z.string().trim().min(1),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.record(z.string(), z.unknown())),
          }),
        },
      },
    },
    async (request, reply) => {
      const events = await service.getOrchestrationEvents(request.params.id);
      return reply.send({
        success: true,
        data: events as unknown as Record<string, unknown>[],
      });
    },
  );

  // GET /api/v1/orchestrations/:id/stream - Live Server-Sent Events (SSE) stream
  app.get(
    '/:id/stream',
    {
      schema: {
        summary: 'Stream Live Orchestration Events (SSE)',
        description: 'Server-Sent Events (SSE) stream delivering real-time task progression, stdout, stderr, and execution state.',
        tags: ['Orchestration'],
        params: z.object({
          id: z.string().trim().min(1),
        }),
      },
    },
    async (request, reply) => {
      await streamService.handleSSEStream(request, reply);
    },
  );

  // POST /api/v1/orchestrations/:id/cancel - Cancel an active orchestration
  app.post(
    '/:id/cancel',
    {
      schema: {
        summary: 'Cancel Orchestration',
        description: 'Transitions an in-flight orchestration session to CANCELLED state.',
        tags: ['Orchestration'],
        params: z.object({
          id: z.string().trim().min(1),
        }),
        body: z
          .object({
            reason: z.string().trim().max(500).optional(),
          })
          .optional(),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    async (request, reply) => {
      const reason = request.body?.reason || 'User requested cancellation';
      const session = await service.cancelOrchestration(request.params.id, reason);
      return reply.send({
        success: true,
        data: session as unknown as Record<string, unknown>,
      });
    },
  );
};

