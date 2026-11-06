import type { PrismaClient } from '@prisma/client';
import { ApprovalStatus, type ApprovalModel } from '../../../database/types.js';
import {
  ApprovalNotFoundError,
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  ApprovalDigestMismatchError,
} from '../security.errors.js';
import { computeActionDigest, verifyActionDigest } from './approval.digest.js';
import { ApprovalRepository } from './approval.repository.js';
import type { ApprovalFilters } from './approval.types.js';
import { AuditService } from '../audit/audit.service.js';
import { ApprovalNotifier } from '../notifications/approval.notifier.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import type { ActionPayload, ApprovalRequestInput } from '../security.types.js';

export interface ApprovalServiceOptions {
  prismaClient?: PrismaClient;
  repository?: ApprovalRepository;
  auditService?: AuditService;
  notifier?: ApprovalNotifier;
  authorizationService?: AuthorizationService;
}

export class ApprovalService {
  private readonly repository: ApprovalRepository;
  private readonly auditService: AuditService;
  private readonly notifier: ApprovalNotifier;
  private readonly authorizationService: AuthorizationService;

  constructor(options: ApprovalServiceOptions = {}) {
    this.repository = options.repository ?? new ApprovalRepository(options.prismaClient);
    this.auditService = options.auditService ?? new AuditService({ prismaClient: options.prismaClient });
    this.notifier = options.notifier ?? new ApprovalNotifier({ prismaClient: options.prismaClient });
    this.authorizationService =
      options.authorizationService ?? new AuthorizationService({ prismaClient: options.prismaClient });
  }

  /**
   * Submits a new approval request and notifies the project room.
   */
  async requestApproval(input: ApprovalRequestInput): Promise<ApprovalModel> {
    const actionDigest =
      input.actionDigest ??
      computeActionDigest({
        category: input.actionCategory,
        type: input.actionType,
        payload: input.payload,
      });

    const expiresInSeconds = input.expiresInSeconds ?? 86400; // Default 24 hours
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const record = await this.repository.create({
      projectId: input.projectId,
      taskId: input.taskId,
      executionId: input.executionId,
      requestedByAgentId: input.requestedByAgentId,
      actionType: input.actionType,
      actionCategory: input.actionCategory,
      riskLevel: input.riskLevel ?? 'L2',
      actionDigest,
      description: input.description,
      payload: input.payload,
      expiresAt,
    });

    // Notify Switch Room
    await this.notifier.notifyApprovalRequested(record);

    // Audit Log
    await this.auditService.logApprovalRequest({
      approvalId: record.id,
      projectId: record.projectId,
      agentId: record.requestedByAgentId,
      actionCategory: record.actionCategory,
      actionType: record.actionType,
      riskLevel: record.riskLevel,
      reason: record.description,
      metadata: {
        actionDigest,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return record;
  }

  /**
   * Approves a pending request with authorization, concurrency safety, and expiration checks.
   */
  async approve(approvalId: string, reviewerUserId: string, decisionReason?: string): Promise<ApprovalModel> {
    const existing = await this.repository.findById(approvalId);
    if (!existing) {
      throw new ApprovalNotFoundError(approvalId);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new ApprovalAlreadyResolvedError(approvalId, existing.status);
    }

    // Check expiration
    if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
      await this.repository.transitionStatus(approvalId, ApprovalStatus.EXPIRED, {
        decisionReason: 'Approval expired before review was completed.',
      });
      await this.notifier.notifyApprovalExpired(existing);
      throw new ApprovalExpiredError(approvalId, new Date(existing.expiresAt));
    }

    // Authorization & Membership check
    await this.authorizationService.assertProjectAuthority(reviewerUserId, existing.projectId);

    // Separation of duties check
    this.authorizationService.assertSeparationOfDuties({
      reviewerUserId,
      requesterUserId: null, // Agent-originated actions or author
      actionType: existing.actionType,
      riskLevel: existing.riskLevel,
    });

    // Concurrency-safe atomic transition
    const updated = await this.repository.transitionStatus(approvalId, ApprovalStatus.APPROVED, {
      reviewedByUserId: reviewerUserId,
      decisionReason: decisionReason ?? 'Approved by authorized human reviewer.',
      reviewedAt: new Date(),
    });

    if (!updated) {
      throw new ApprovalAlreadyResolvedError(approvalId, 'CONCURRENT_UPDATE');
    }

    // Notify Switch Room
    await this.notifier.notifyApprovalDecision(updated, 'APPROVED', decisionReason);

    // Audit Log
    await this.auditService.logApprovalDecision({
      approvalId: updated.id,
      projectId: updated.projectId,
      reviewerUserId,
      decision: 'APPROVED',
      reason: decisionReason,
      actionCategory: updated.actionCategory,
      actionType: updated.actionType,
      metadata: {
        actionDigest: updated.actionDigest,
      },
    });

    return updated;
  }

  /**
   * Rejects a pending request.
   */
  async reject(approvalId: string, reviewerUserId: string, decisionReason?: string): Promise<ApprovalModel> {
    const existing = await this.repository.findById(approvalId);
    if (!existing) {
      throw new ApprovalNotFoundError(approvalId);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new ApprovalAlreadyResolvedError(approvalId, existing.status);
    }

    // Authorization & Membership check
    await this.authorizationService.assertProjectAuthority(reviewerUserId, existing.projectId);

    // Concurrency-safe atomic transition
    const updated = await this.repository.transitionStatus(approvalId, ApprovalStatus.REJECTED, {
      reviewedByUserId: reviewerUserId,
      decisionReason: decisionReason ?? 'Rejected by human reviewer.',
      reviewedAt: new Date(),
    });

    if (!updated) {
      throw new ApprovalAlreadyResolvedError(approvalId, 'CONCURRENT_UPDATE');
    }

    // Notify Switch Room
    await this.notifier.notifyApprovalDecision(updated, 'REJECTED', decisionReason);

    // Audit Log
    await this.auditService.logApprovalDecision({
      approvalId: updated.id,
      projectId: updated.projectId,
      reviewerUserId,
      decision: 'REJECTED',
      reason: decisionReason,
      actionCategory: updated.actionCategory,
      actionType: updated.actionType,
    });

    return updated;
  }

  /**
   * Cancels a pending approval request.
   */
  async cancel(approvalId: string, userId: string, reason?: string): Promise<ApprovalModel> {
    const existing = await this.repository.findById(approvalId);
    if (!existing) {
      throw new ApprovalNotFoundError(approvalId);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new ApprovalAlreadyResolvedError(approvalId, existing.status);
    }

    // Authorization check
    await this.authorizationService.assertProjectAuthority(userId, existing.projectId);

    const updated = await this.repository.transitionStatus(approvalId, ApprovalStatus.CANCELLED, {
      reviewedByUserId: userId,
      decisionReason: reason ?? 'Cancelled by user.',
      reviewedAt: new Date(),
    });

    if (!updated) {
      throw new ApprovalAlreadyResolvedError(approvalId, 'CONCURRENT_UPDATE');
    }

    await this.notifier.notifyApprovalDecision(updated, 'CANCELLED', reason);

    await this.auditService.logApprovalDecision({
      approvalId: updated.id,
      projectId: updated.projectId,
      reviewerUserId: userId,
      decision: 'CANCELLED',
      reason,
      actionCategory: updated.actionCategory,
      actionType: updated.actionType,
    });

    return updated;
  }

  /**
   * Validates whether an approval is approved, not expired, and matches the exact action payload digest.
   */
  async validateExecutionApproval(approvalId: string, action: ActionPayload): Promise<boolean> {
    const approval = await this.repository.findById(approvalId);
    if (!approval) {
      throw new ApprovalNotFoundError(approvalId);
    }

    if (approval.status !== ApprovalStatus.APPROVED) {
      return false;
    }

    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      throw new ApprovalExpiredError(approvalId, new Date(approval.expiresAt));
    }

    if (approval.actionDigest && !verifyActionDigest(action, approval.actionDigest)) {
      const currentDigest = computeActionDigest(action);
      throw new ApprovalDigestMismatchError(approvalId, approval.actionDigest, currentDigest);
    }

    return true;
  }

  async getApproval(id: string): Promise<ApprovalModel | null> {
    return this.repository.findById(id);
  }

  async listApprovals(filters: ApprovalFilters = {}) {
    return this.repository.findMany(filters);
  }
}
