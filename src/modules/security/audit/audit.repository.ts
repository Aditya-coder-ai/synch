import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { AuditLogEntryInput, AuditLogQueryFilters } from './audit.types.js';

export class AuditRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? getPrismaClient();
  }

  /**
   * Appends an audit event to the append-only AuditLog table.
   */
  async append(entry: AuditLogEntryInput): Promise<{ id: string; createdAt: Date }> {
    const record = await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorType: entry.actorType ?? 'SYSTEM',
        workspaceId: entry.workspaceId ?? null,
        projectId: entry.projectId ?? null,
        actionCategory: entry.actionCategory,
        actionType: entry.actionType,
        riskLevel: entry.riskLevel ?? 'L0',
        outcome: entry.outcome,
        reason: entry.reason ?? null,
        resourceId: entry.resourceId ?? null,
        metadata: (entry.metadata as unknown as Prisma.InputJsonValue) ?? {},
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return record;
  }

  /**
   * Queries audit logs with filtering and pagination.
   */
  async findMany(filters: AuditLogQueryFilters = {}) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.workspaceId) where.workspaceId = filters.workspaceId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.actionCategory) where.actionCategory = filters.actionCategory;
    if (filters.outcome) where.outcome = filters.outcome;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const offset = Math.max(filters.offset ?? 0, 0);

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}

