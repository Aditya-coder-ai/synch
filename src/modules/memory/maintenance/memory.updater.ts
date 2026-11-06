import type { MemoryRepository } from '../storage/memory.repository.js';
import type { CandidateMemory, MemoryRecord } from '../memory.types.js';
import { MemoryValidator } from '../extraction/memory.validator.js';
import { AppError } from '../../../common/errors/app-error.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';

export class MemoryUpdater {
  constructor(private readonly repository: MemoryRepository) {}

  /**
   * Updates an existing memory with conflict and verification checks.
   * Prevents unverified notes from overwriting established verified decisions.
   */
  async updateMemory(
    projectId: string,
    memoryId: string,
    update: Partial<CandidateMemory>,
  ): Promise<MemoryRecord> {
    const existing = await this.repository.findById(projectId, memoryId);
    if (!existing) {
      throw new AppError(`Memory '${memoryId}' not found in project '${projectId}'`, 404, ErrorCode.MEMORY_NOT_FOUND);
    }

    // Safety constraint: Prevent unverified updates from downgrading or overwriting verified decisions
    if (existing.metadata.verified && update.metadata && update.metadata.verified === false) {
      throw new AppError(
        `Conflict: Cannot downgrade verified decision '${existing.title}' with unverified assertion`,
        409,
        ErrorCode.CONFLICT,
      );
    }

    const sanitizedTitle = update.title ? MemoryValidator.sanitizeSecrets(update.title) : undefined;
    const sanitizedContent = update.content ? MemoryValidator.sanitizeSecrets(update.content) : undefined;

    return this.repository.update(projectId, memoryId, {
      title: sanitizedTitle,
      content: sanitizedContent,
      category: update.category,
      metadata: {
        ...existing.metadata,
        ...update.metadata,
        previousVersionAt: existing.updatedAt.toISOString(),
      },
    });
  }
}
