import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { PermissionDecision, type ActionPayload } from '../security.types.js';
import { PermissionDeniedError, ApprovalExpiredError, ApprovalDigestMismatchError } from '../security.errors.js';
import { PermissionEvaluator } from '../permissions/permission.evaluator.js';
import { ApprovalService } from '../approvals/approval.service.js';
import { ApprovalRepository } from '../approvals/approval.repository.js';
import { computeActionDigest, verifyActionDigest } from '../approvals/approval.digest.js';
import { AuditService } from '../audit/audit.service.js';

export interface ExecutionGuardOptions {
  prismaClient?: PrismaClient;
  evaluator?: PermissionEvaluator;
  approvalService?: ApprovalService;
  approvalRepository?: ApprovalRepository;
  auditService?: AuditService;
}

export class ExecutionGuard {
  private readonly evaluator: PermissionEvaluator;
  private readonly approvalService: ApprovalService;
  private readonly approvalRepository: ApprovalRepository;
  private readonly auditService: AuditService;

  constructor(options: ExecutionGuardOptions = {}) {
    const prisma = options.prismaClient ?? getPrismaClient();
    this.evaluator = options.evaluator ?? new PermissionEvaluator();
    this.approvalService = options.approvalService ?? new ApprovalService({ prismaClient: prisma });
    this.approvalRepository = options.approvalRepository ?? new ApprovalRepository(prisma);
    this.auditService = options.auditService ?? new AuditService({ prismaClient: prisma });
  }

  /**
   * Asserts whether an execution step or action is authorized to proceed.
   * If approval is required, checks for a valid, non-expired, matching APPROVED approval.
   * If none exists, creates a pending approval request and throws PermissionDeniedError.
   */
  async assertAuthorized(params: {
    projectId: string;
    executionId?: string;
    taskId?: string;
    agentId?: string;
    action: ActionPayload;
  }): Promise<{ authorized: boolean; approvalId?: string; reason: string }> {
    const evaluation = this.evaluator.evaluateAction({
      project: { id: params.projectId },
      execution: params.executionId ? { id: params.executionId, taskId: params.taskId } : undefined,
      agent: params.agentId ? { id: params.agentId, role: 'AGENT' } : undefined,
      action: params.action,
    });

    const actionDigest = computeActionDigest(params.action);

    // 1. Direct allow
    if (evaluation.decision === PermissionDecision.ALLOWED) {
      await this.auditService.logPermissionEvaluation({
        actorId: params.agentId,
        actorType: 'AGENT',
        projectId: params.projectId,
        actionCategory: params.action.category,
        actionType: params.action.type,
        riskLevel: evaluation.riskLevel,
        outcome: 'ALLOWED',
        reason: evaluation.reason,
        metadata: { actionDigest },
      });

      return {
        authorized: true,
        reason: evaluation.reason,
      };
    }

    // 2. Immediate denial
    if (evaluation.decision === PermissionDecision.DENIED) {
      await this.auditService.logBlockedOperation({
        projectId: params.projectId,
        actorId: params.agentId,
        actionCategory: params.action.category,
        actionType: params.action.type,
        reason: evaluation.reason,
        metadata: { actionDigest },
      });

      throw new PermissionDeniedError(
        `Action '${params.action.type}' is strictly denied by security policy: ${evaluation.reason}`,
        { evaluation, action: params.action },
      );
    }

    // 3. Approval required: Check if an approved record already exists for this execution and digest
    if (params.executionId) {
      const approvedRecord = await this.approvalRepository.findPendingByExecutionAndDigest(
        params.executionId,
        actionDigest,
      );

      if (approvedRecord) {
        // Validate not expired
        if (approvedRecord.expiresAt && new Date(approvedRecord.expiresAt) < new Date()) {
          throw new ApprovalExpiredError(approvedRecord.id, new Date(approvedRecord.expiresAt));
        }

        // Validate cryptographic digest match
        if (approvedRecord.actionDigest && !verifyActionDigest(params.action, approvedRecord.actionDigest)) {
          throw new ApprovalDigestMismatchError(
            approvedRecord.id,
            approvedRecord.actionDigest,
            actionDigest,
          );
        }

        // Authorized via verified approval!
        await this.auditService.log({
          actorId: params.agentId,
          actorType: 'AGENT',
          projectId: params.projectId,
          actionCategory: params.action.category,
          actionType: params.action.type,
          riskLevel: approvedRecord.riskLevel,
          outcome: 'APPROVED',
          reason: `Execution authorized via human approval '${approvedRecord.id}'.`,
          resourceId: approvedRecord.id,
          metadata: { actionDigest },
        });

        return {
          authorized: true,
          approvalId: approvedRecord.id,
          reason: `Authorized via verified human approval '${approvedRecord.id}'.`,
        };
      }
    }

    // 4. No approved record exists: Create a pending approval request
    const pendingApproval = await this.approvalService.requestApproval({
      projectId: params.projectId,
      taskId: params.taskId,
      executionId: params.executionId,
      requestedByAgentId: params.agentId,
      actionCategory: params.action.category,
      actionType: params.action.type,
      description: evaluation.reason,
      riskLevel: evaluation.riskLevel,
      payload: params.action.payload,
      actionDigest,
    });

    throw new PermissionDeniedError(
      `Action '${params.action.type}' requires human approval: ${evaluation.reason}`,
      {
        approvalId: pendingApproval.id,
        actionDigest,
        riskLevel: evaluation.riskLevel,
        status: 'AWAITING_APPROVAL',
      },
    );
  }
}

