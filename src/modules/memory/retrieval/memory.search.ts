import type { MemoryRecord, MemorySearchQuery } from '../memory.types.js';

export interface IMemorySearchProvider {
  search(records: MemoryRecord[], query: MemorySearchQuery): MemoryRecord[];
}

export class PostgresTextSearchProvider implements IMemorySearchProvider {
  /**
   * Filters records based on query keywords and categories.
   */
  search(records: MemoryRecord[], query: MemorySearchQuery): MemoryRecord[] {
    return records.filter(record => {
      // 1. Strict project match
      if (record.projectId !== query.projectId) {
        return false;
      }

      // 2. Archived filter
      if (!query.includeArchived && record.metadata.archived) {
        return false;
      }

      // 3. Category filter
      if (query.categories && query.categories.length > 0) {
        if (!query.categories.includes(record.category)) {
          return false;
        }
      }

      // 4. Verified filter
      if (query.verifiedOnly && !record.metadata.verified) {
        return false;
      }

      // 5. Min confidence filter
      if (query.minConfidence && (record.metadata.confidence ?? 0) < query.minConfidence) {
        return false;
      }

      // 6. Keywords match (case-insensitive substring)
      if (query.keywords && query.keywords.length > 0) {
        const text = `${record.title} ${record.content} ${(record.metadata.tags || []).join(' ')}`.toLowerCase();
        const matchesAny = query.keywords.some(k => text.includes(k.toLowerCase()));
        if (!matchesAny) {
          return false;
        }
      }

      return true;
    });
  }
}
