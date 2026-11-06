import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../database/prisma.js';
import type { SwitchService } from '../switch/switch.service.js';
import { ApprovalService } from './approvals/approval.service.js';
import { ApprovalRepository } from './approvals/approval.repository.js';
import { ApprovalController } from './approvals/approval.controller.js';
import { approvalRoutes } from './approvals/approval.routes.js';
import { AuditService } from './audit/audit.service.js';
import { AuditRepository } from './audit/audit.repository.js';
import { IdentityService } from './identity/identity.service.js';
import { AuthorizationService } from './identity/authorization.service.js';
import { ApprovalNotifier } from './notifications/approval.notifier.js';
import { ExecutionGuard } from './guards/execution.guard.js';

export interface SecurityModuleOptions {
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
  approvalService?: ApprovalService;
  auditService?: AuditService;
  identityService?: IdentityService;
  authorizationService?: AuthorizationService;
  executionGuard?: ExecutionGuard;
}

export const securityModule: FastifyPluginAsync<SecurityModuleOptions> = async (
  fastify,
  options,
): Promise<void> => {
  const prisma = options.prismaClient ?? getPrismaClient();
  const auditRepository = new AuditRepository(prisma);
  const auditService = options.auditService ?? new AuditService({ prismaClient: prisma, repository: auditRepository });
  const identityService = options.identityService ?? new IdentityService({ prismaClient: prisma });
  const authorizationService =
    options.authorizationService ?? new AuthorizationService({ prismaClient: prisma });
  const notifier = new ApprovalNotifier({ prismaClient: prisma, switchService: options.switchService });
  const approvalRepository = new ApprovalRepository(prisma);

  const approvalService =
    options.approvalService ??
    new ApprovalService({
      prismaClient: prisma,
      repository: approvalRepository,
      auditService,
      notifier,
      authorizationService,
    });

  const controller = new ApprovalController(approvalService, identityService, auditService);

  // 1. Register Approvals API under /approvals
  await fastify.register(approvalRoutes, {
    prefix: '/approvals',
    controller,
  });

  // 2. Register Security Audit Trail under /security/audit
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();
  typedFastify.get(
    '/security/audit',
    {
      schema: {
        summary: 'Query Security Audit Logs',
        description: 'Retrieves append-only security audit log events with actor, action, and risk filtering.',
        tags: ['Security & Approvals'],
        querystring: z.object({
          projectId: z.string().trim().min(1).optional(),
          workspaceId: z.string().trim().min(1).optional(),
          actorId: z.string().trim().min(1).optional(),
          actorType: z.string().trim().min(1).optional(),
          actionCategory: z.string().trim().min(1).optional(),
          outcome: z.string().trim().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
          offset: z.coerce.number().int().min(0).default(0),
        }),
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
    (req, reply) => controller.getAuditLogs(req, reply),
  );
};

