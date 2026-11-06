import type { MemoryRepository } from '../storage/memory.repository.js';
import { PostgresTextSearchProvider, type IMemorySearchProvider } from './memory.search.js';
import { MemoryRanker } from './memory.ranker.js';
import type { MemorySearchQuery, RankedMemory } from '../memory.types.js';

export interface MemoryRetrieverOptions {
  repository: MemoryRepository;
  searchProvider?: IMemorySearchProvider;
}

export class MemoryRetriever {
  private readonly repository: MemoryRepository;
  private readonly searchProvider: IMemorySearchProvider;

  constructor(options: MemoryRetrieverOptions) {
    this.repository = options.repository;
    this.searchProvider = options.searchProvider ?? new PostgresTextSearchProvider();
  }

  /**
   * Retrieves and ranks memories strictly scoped to the project.
   */
  async retrieve(query: MemorySearchQuery): Promise<RankedMemory[]> {
    // 1. Fetch project memories from repository
    const allProjectMemories = await this.repository.findMany({
      projectId: query.projectId,
      categories: query.categories,
      taskId: query.taskId,
      limit: 100,
    });

    // 2. Filter candidates using search provider
    const filtered = this.searchProvider.search(allProjectMemories, query);

    // 3. Rank filtered candidates
    const ranked = MemoryRanker.rank(filtered, query.keywords);

    // 4. Cap to limit
    const limit = query.limit ?? 10;
    return ranked.slice(0, limit);
  }
}

