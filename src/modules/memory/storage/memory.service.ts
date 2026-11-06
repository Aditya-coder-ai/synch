import { MemoryRepository } from './memory.repository.js';
import { MemoryValidator } from '../extraction/memory.validator.js';
import type { CandidateMemory, MemoryRecord, MemorySearchQuery } from '../memory.types.js';
import { AppError } from '../../../common/errors/app-error.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';

export interface MemoryServiceOptions {
  repository?: MemoryRepository;
}

export class MemoryService {
  private readonly repository: MemoryRepository;

  constructor(options: MemoryServiceOptions = {}) {
    this.repository = options.repository ?? new MemoryRepository();
  }

  /**
   * Stores a candidate memory after validating, sanitizing, and checking for duplicates.
   */
  async storeMemory(candidate: CandidateMemory): Promise<MemoryRecord> {
    // 1. Validate candidate memory
    const validation = MemoryValidator.validate(candidate);
    if (!validation.valid || !validation.sanitizedMemory) {
      throw new AppError(
        `Memory validation failed: ${validation.rejectionReason}`,
        400,
        ErrorCode.MEMORY_VALIDATION_ERROR,
      );
    }

    const sanitized = validation.sanitizedMemory;

    // 2. Duplicate Detection: Check for identical title & category within project
    const existing = await this.repository.findMany({
      projectId: sanitized.projectId,
      categories: [sanitized.category],
      limit: 10,
    });

    const duplicate = existing.find(
      e =>
        e.title.toLowerCase() === sanitized.title.toLowerCase() ||
        e.content.toLowerCase() === sanitized.content.toLowerCase(),
    );

    if (duplicate) {
      // If candidate is verified but duplicate is unverified, upgrade the duplicate
      if (sanitized.metadata?.verified && !duplicate.metadata.verified) {
        return this.repository.update(sanitized.projectId, duplicate.id, {
          content: sanitized.content,
          metadata: {
            ...duplicate.metadata,
            ...sanitized.metadata,
            verified: true,
            updatedReason: 'Upgraded with verified execution evidence',
          },
        });
      }
      return duplicate;
    }

    return this.repository.create(sanitized);
  }

  /**
   * Retrieves memory record by ID with project boundary enforcement.
   */
  async getMemory(projectId: string, id: string): Promise<MemoryRecord> {
    const memory = await this.repository.findById(projectId, id);
    if (!memory) {
      throw new AppError(
        `Memory entry '${id}' not found in project '${projectId}'`,
        404,
        ErrorCode.MEMORY_NOT_FOUND,
      );
    }
    return memory;
  }

  /**
   * Lists project memories.
   */
  async listMemories(query: MemorySearchQuery): Promise<MemoryRecord[]> {
    return this.repository.findMany(query);
  }
}
