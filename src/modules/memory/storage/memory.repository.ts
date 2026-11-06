import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { CandidateMemory, MemoryMetadata, MemoryRecord, MemorySearchQuery } from '../memory.types.js';
import { MemoryCategory } from '../../../database/types.js';

export interface MemoryRepositoryOptions {
  prismaClient?: PrismaClient;
}

export class MemoryRepository {
  private readonly prisma: PrismaClient;

  constructor(options: MemoryRepositoryOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Persists a validated memory record in PostgreSQL.
   */
  async create(candidate: CandidateMemory): Promise<MemoryRecord> {
    const record = await this.prisma.memoryEntry.create({
      data: {
        projectId: candidate.projectId,
        taskId: candidate.taskId || null,
        category: candidate.category,
        title: candidate.title,
        content: candidate.content,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId || null,
        metadata: (candidate.metadata as unknown as Prisma.InputJsonValue) ?? {},
      },
    });

    return this.mapToRecord(record);
  }

  /**
   * Finds a memory entry by ID strictly within project bounds.
   */
  async findById(projectId: string, id: string): Promise<MemoryRecord | null> {
    const record = await this.prisma.memoryEntry.findFirst({
      where: {
        id,
        projectId,
      },
    });

    return record ? this.mapToRecord(record) : null;
  }

  /**
   * Queries memories for a project based on criteria.
   */
  async findMany(query: MemorySearchQuery): Promise<MemoryRecord[]> {
    const where: Prisma.MemoryEntryWhereInput = {
      projectId: query.projectId,
    };

    if (query.taskId) {
      where.taskId = query.taskId;
    }

    if (query.categories && query.categories.length > 0) {
      where.category = { in: query.categories };
    }

    const records = await this.prisma.memoryEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });

    return records.map(r => this.mapToRecord(r));
  }

  /**
   * Updates an existing memory entry.
   */
  async update(
    projectId: string,
    id: string,
    data: Partial<Pick<CandidateMemory, 'title' | 'content' | 'category' | 'metadata'>>,
  ): Promise<MemoryRecord> {
    const updateData: Prisma.MemoryEntryUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.title) updateData.title = data.title;
    if (data.content) updateData.content = data.content;
    if (data.category) updateData.category = data.category;
    if (data.metadata) {
      updateData.metadata = data.metadata as unknown as Prisma.InputJsonValue;
    }

    const record = await this.prisma.memoryEntry.update({
      where: {
        id,
        projectId,
      },
      data: updateData,
    });

    return this.mapToRecord(record);
  }

  /**
   * Deletes a memory entry strictly within project bounds.
   */
  async delete(projectId: string, id: string): Promise<void> {
    await this.prisma.memoryEntry.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }

  private mapToRecord(record: any): MemoryRecord {
    return {
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId,
      category: record.category as MemoryCategory,
      title: record.title,
      content: record.content,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      metadata: (record.metadata as MemoryMetadata) || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

