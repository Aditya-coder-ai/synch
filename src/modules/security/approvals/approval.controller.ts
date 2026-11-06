import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ApprovalService } from './approval.service.js';
import type { IdentityService } from '../identity/identity.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { ApprovalFilters } from './approval.types.js';

export class ApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly identityService: IdentityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to authenticate the caller via request headers.
   */
  private async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const user = await this.identityService.resolveUser(request.headers as Record<string, string>);
    if (!user) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Provide valid x-user-id or Authorization bearer header.',
        },
      });
      return null;
    }
    return user.id;
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const filters = (request.query || {}) as ApprovalFilters;
    const result = await this.approvalService.listApprovals(filters);
    return reply.send({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { id: string };
    const approval = await this.approvalService.getApproval(params.id);
    if (!approval) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: `Approval '${params.id}' was not found.`,
        },
      });
    }

    return reply.send({
      success: true,
      data: approval,
    });
  }

  async approve(request: FastifyRequest, reply: FastifyReply) {
    const userId = await this.authenticate(request, reply);
    if (!userId) return;

    const params = request.params as { id: string };
    const body = (request.body || {}) as { decisionReason?: string };

    const approval = await this.approvalService.approve(
      params.id,
      userId,
      body.decisionReason,
    );

    return reply.send({
      success: true,
      data: approval,
    });
  }

  async reject(request: FastifyRequest, reply: FastifyReply) {
    const userId = await this.authenticate(request, reply);
    if (!userId) return;

    const params = request.params as { id: string };
    const body = (request.body || {}) as { decisionReason?: string };

    const approval = await this.approvalService.reject(
      params.id,
      userId,
      body.decisionReason,
    );

    return reply.send({
      success: true,
      data: approval,
    });
  }

  async cancel(request: FastifyRequest, reply: FastifyReply) {
    const userId = await this.authenticate(request, reply);
    if (!userId) return;

    const params = request.params as { id: string };
    const body = (request.body || {}) as { decisionReason?: string };

    const approval = await this.approvalService.cancel(
      params.id,
      userId,
      body.decisionReason,
    );

    return reply.send({
      success: true,
      data: approval,
    });
  }

  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    const query = (request.query || {}) as {
      projectId?: string;
      actorId?: string;
      outcome?: string;
      limit?: number;
      offset?: number;
    };
    const result = await this.auditService.queryLogs(query);
    return reply.send({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  }
}
