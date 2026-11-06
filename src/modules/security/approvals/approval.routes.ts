import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  approvalDecisionSchema,
  approvalIdParamSchema,
  approvalQueryFiltersSchema,
} from './approval.schemas.js';
import type { ApprovalController } from './approval.controller.js';

export interface ApprovalRoutesOptions {
  controller: ApprovalController;
}

export const approvalRoutes: FastifyPluginAsync<ApprovalRoutesOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const controller = options.controller;

  // GET /api/v1/approvals - List approvals
  app.get(
    '',
    {
      schema: {
        summary: 'List Approvals',
        description: 'Retrieves pending and historic human approval requests with filtering by project, status, and risk level.',
        tags: ['Security & Approvals'],
        querystring: approvalQueryFiltersSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(z.record(z.string(), z.unknown())),
            pagination: z.object({
              total: z.number(),
              limit: z.number(),
              offset: z.number(),
            }),
          }),
        },
      },
    },
    (req, reply) => controller.list(req, reply),
  );

  // GET /api/v1/approvals/:id - Get approval details
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get Approval Details',
        description: 'Retrieves an approval request with status, cryptographic digest, and decision metadata.',
        tags: ['Security & Approvals'],
        params: approvalIdParamSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    (req, reply) => controller.getById(req, reply),
  );

  // POST /api/v1/approvals/:id/approve - Approve pending request
  app.post(
    '/:id/approve',
    {
      schema: {
        summary: 'Approve Pending Action',
        description: 'Authorizes a sensitive operation with authenticated human identity and workspace role verification.',
        tags: ['Security & Approvals'],
        params: approvalIdParamSchema,
        body: approvalDecisionSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    (req, reply) => controller.approve(req, reply),
  );

  // POST /api/v1/approvals/:id/reject - Reject pending request
  app.post(
    '/:id/reject',
    {
      schema: {
        summary: 'Reject Pending Action',
        description: 'Rejects a sensitive operation request and blocks associated agent execution.',
        tags: ['Security & Approvals'],
        params: approvalIdParamSchema,
        body: approvalDecisionSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    (req, reply) => controller.reject(req, reply),
  );

  // POST /api/v1/approvals/:id/cancel - Cancel pending request
  app.post(
    '/:id/cancel',
    {
      schema: {
        summary: 'Cancel Pending Action',
        description: 'Cancels an outstanding approval request before a decision is reached.',
        tags: ['Security & Approvals'],
        params: approvalIdParamSchema,
        body: approvalDecisionSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.record(z.string(), z.unknown()),
          }),
        },
      },
    },
    (req, reply) => controller.cancel(req, reply),
  );
};

