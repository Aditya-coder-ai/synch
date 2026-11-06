import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ApprovalStatus } from '../../../database/types.js';
import { PermissionDeniedError } from '../opencode/opencode.errors.js';
import { PermissionPolicy, type OperationRequest, type PermissionEvaluation } from './permission.policy.js';

export interface PermissionManagerOptions {
  prismaClient?: PrismaClient;
}

export class PermissionManager {
  private readonly prisma: PrismaClient;

  constructor(options: PermissionManagerOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Asserts whether an action is permitted. If it requires human approval, records a pending Approval
   * record and throws PermissionDeniedError (or returns the evaluation in non-strict mode).
   */
  async checkPermission(
    request: OperationRequest,
    context?: { projectId: string; taskId?: string; executionId?: string; agentId?: string },
  ): Promise<PermissionEvaluation> {
    const evaluation = PermissionPolicy.evaluate(request);

    if (evaluation.requiresHumanApproval && context?.projectId) {
      // Record pending approval in database
      await this.prisma.approval.create({
        data: {
          projectId: context.projectId,
          taskId: context.taskId || null,
          executionId: context.executionId || null,
          requestedByAgentId: context.agentId || null,
          actionType: request.action,
          description: evaluation.reason,
          status: ApprovalStatus.PENDING,
          payload: (request.payload as object) || {},
        },
      });

      throw new PermissionDeniedError(
        `Action '${request.action}' requires human approval: ${evaluation.reason}`,
        { evaluation, request },
      );
    }

    if (!evaluation.allowed) {
      throw new PermissionDeniedError(
        `Action '${request.action}' is denied by permission policy: ${evaluation.reason}`,
        { evaluation, request },
      );
    }

    return evaluation;
  }
}

