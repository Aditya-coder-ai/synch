import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { SwitchService } from './switch.service.js';
import {
  switchStatusResponseSchema,
  outboundMessageInputSchema,
  mapRoomInputSchema,
} from './switch.schemas.js';
import { successResponse } from '../../common/utils/response.js';

export interface SwitchRouteOptions {
  switchService: SwitchService;
}

export const switchRoutes: FastifyPluginAsync<SwitchRouteOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const service = options.switchService;
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/integrations/switch/status
  server.get(
    '/status',
    {
      schema: {
        description: 'Get Switch integration connection status and metrics',
        tags: ['Integrations - Switch'],
        response: {
          200: switchStatusResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const status = service.getStatus();
      return reply.status(200).send(successResponse(status));
    },
  );

  // GET /api/v1/integrations/switch/health
  server.get(
    '/health',
    {
      schema: {
        description: 'Probe Switch server connectivity and bridge health',
        tags: ['Integrations - Switch'],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              ok: z.boolean(),
              status: z.number(),
              message: z.string(),
            }),
          }),
          503: z.object({
            success: z.boolean(),
            data: z.object({
              ok: z.boolean(),
              status: z.number(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (_request, reply) => {
      const health = await service.getHealth();
      const code = health.ok ? 200 : 503;
      return reply.status(code).send({
        success: health.ok,
        data: health,
      });
    },
  );

  // POST /api/v1/integrations/switch/rooms/map
  server.post(
    '/rooms/map',
    {
      schema: {
        description: 'Map a Switch Room ID to a CrewFlow Conversation',
        tags: ['Integrations - Switch'],
        body: mapRoomInputSchema,
      },
    },
    async (request, reply) => {
      const { roomId, conversationId } = request.body;
      const conversation = await service.mapRoom(roomId, conversationId);
      return reply.status(200).send(
        successResponse({
          mapped: true,
          conversationId: conversation.id,
          roomId: conversation.externalRoomId,
        }),
      );
    },
  );

  // POST /api/v1/integrations/switch/messages
  server.post(
    '/messages',
    {
      schema: {
        description: 'Send an outbound message to a Switch room',
        tags: ['Integrations - Switch'],
        body: outboundMessageInputSchema,
      },
    },
    async (request, reply) => {
      const result = await service.sendMessage(request.body);
      return reply.status(200).send(successResponse(result));
    },
  );
};

