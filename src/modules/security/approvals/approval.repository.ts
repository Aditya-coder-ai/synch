import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ApprovalStatus, type ApprovalModel } from '../../../database/types.js';
import type { ApprovalFilters, CreateApprovalRecordInput } from './approval.types.js';

export class ApprovalRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? getPrismaClient();
  }

  /**
   * Persists a new pending approval record.
   */
  async create(input: CreateApprovalRecordInput): Promise<ApprovalModel> {
    const record = await this.prisma.approval.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId ?? null,
        executionId: input.executionId ?? null,
        requestedByAgentId: input.requestedByAgentId ?? null,
        actionType: input.actionType,
        actionCategory: input.actionCategory,
        riskLevel: input.riskLevel,
        actionDigest: input.actionDigest,
        description: input.description,
        status: ApprovalStatus.PENDING,
        payload: (input.payload as unknown as Prisma.InputJsonValue) ?? {},
        expiresAt: input.expiresAt ?? null,
      },
    });

    return record as unknown as ApprovalModel;
  }

  /**
   * Finds an approval record by ID.
   */
  async findById(id: string): Promise<ApprovalModel | null> {
    const record = await this.prisma.approval.findUnique({
      where: { id },
    });
    return record as unknown as ApprovalModel | null;
  }

  /**
   * Atomic, concurrency-safe transition from PENDING to a target status.
   * Returns null if the approval was already resolved or not in PENDING status.
   */
  async transitionStatus(
    id: string,
    targetStatus: ApprovalStatus,
    data: {
      reviewedByUserId?: string | null;
      decisionReason?: string | null;
      reviewedAt?: Date | null;
    },
  ): Promise<ApprovalModel | null> {
    return this.prisma.$transaction(async tx => {
      // Find within transaction with status check
      const existing = await tx.approval.findUnique({
        where: { id },
      });

      if (!existing || existing.status !== ApprovalStatus.PENDING) {
        return null;
      }

      const updated = await tx.approval.update({
        where: { id },
        data: {
          status: targetStatus,
          reviewedByUserId: data.reviewedByUserId ?? null,
          decisionReason: data.decisionReason ?? null,
          reviewedAt: data.reviewedAt ?? new Date(),
        },
      });

      return updated as unknown as ApprovalModel;
    });
  }

  /**
   * Finds active pending approval for a specific execution and action digest.
   */
  async findPendingByExecutionAndDigest(
    executionId: string,
    actionDigest: string,
  ): Promise<ApprovalModel | null> {
    const record = await this.prisma.approval.findFirst({
      where: {
        executionId,
        actionDigest,
        status: ApprovalStatus.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
    });
    return record as unknown as ApprovalModel | null;
  }

  /**
   * Queries approvals with filtering and pagination.
   */
  async findMany(filters: ApprovalFilters = {}) {
    const where: Prisma.ApprovalWhereInput = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    if (filters.taskId) where.taskId = filters.taskId;
    if (filters.executionId) where.executionId = filters.executionId;
    if (filters.actionCategory) where.actionCategory = filters.actionCategory;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);

    const [items, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.approval.count({ where }),
    ]);

    return {
      items: items as unknown as ApprovalModel[],
      total,
      limit,
      offset,
    };
  }
}
