import type { MemoryRepository } from '../storage/memory.repository.js';
import type { MemoryRecord } from '../memory.types.js';

export class MemoryArchiver {
  constructor(private readonly repository: MemoryRepository) {}

  /**
   * Soft-archives an obsolete or superseded memory record.
   */
  async archive(projectId: string, memoryId: string, reason: string): Promise<MemoryRecord> {
    const existing = await this.repository.findById(projectId, memoryId);
    if (!existing) {
      throw new Error(`Memory record '${memoryId}' not found in project '${projectId}'`);
    }

    return this.repository.update(projectId, memoryId, {
      metadata: {
        ...existing.metadata,
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedReason: reason,
      },
    });
  }
}
