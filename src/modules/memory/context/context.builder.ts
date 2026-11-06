import type { MemoryRetriever } from '../retrieval/memory.retriever.js';
import { MemoryCategory } from '../../../database/types.js';
import type { ContextItem, StructuredAgentContext, ContextBuildConfig } from './context.types.js';
import { DEFAULT_CONTEXT_POLICY } from './context.policy.js';
import type { MemoryRecord } from '../memory.types.js';

export interface ContextBuilderOptions {
  retriever: MemoryRetriever;
  config?: ContextBuildConfig;
}

export class ContextBuilder {
  private readonly retriever: MemoryRetriever;
  private readonly config: Required<ContextBuildConfig>;

  constructor(options: ContextBuilderOptions) {
    this.retriever = options.retriever;
    this.config = {
      ...DEFAULT_CONTEXT_POLICY,
      ...options.config,
    };
  }

  /**
   * Constructs a structured, prioritized, and bounded agent context for a task.
   */
  async buildContext(
    projectId: string,
    taskId: string,
    taskTitle: string,
    keywords: string[] = [],
  ): Promise<StructuredAgentContext> {
    const combinedKeywords = Array.from(new Set([...taskTitle.split(/\s+/), ...keywords]))
      .filter(w => w.length > 2);

    // 1. Retrieve ranked memories across categories
    const rankedItems = await this.retriever.retrieve({
      projectId,
      keywords: combinedKeywords,
      minConfidence: this.config.minConfidenceThreshold,
      limit: 30,
    });

    const decisions: ContextItem[] = [];
    const technicalKnowledge: ContextItem[] = [];
    const taskHistory: ContextItem[] = [];
    const lessonsLearned: ContextItem[] = [];

    let verifiedCount = 0;
    let unverifiedCount = 0;
    let totalChars = 0;

    const toContextItem = (record: MemoryRecord): ContextItem => {
      const verified = Boolean(record.metadata.verified);
      if (verified) verifiedCount++;
      else unverifiedCount++;

      return {
        id: record.id,
        category: record.category,
        title: record.title,
        content: record.content,
        verified,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        confidence: record.metadata.confidence ?? 0.8,
      };
    };

    for (const ranked of rankedItems) {
      const rec = ranked.memory;
      const itemLength = rec.title.length + rec.content.length;

      if (totalChars + itemLength > this.config.maxContextCharacters) {
        break; // Context size limit reached
      }

      switch (rec.category) {
        case MemoryCategory.DECISION:
          if (decisions.length < this.config.maxItemsPerCategory) {
            decisions.push(toContextItem(rec));
            totalChars += itemLength;
          }
          break;
        case MemoryCategory.TECHNICAL_KNOWLEDGE:
          if (technicalKnowledge.length < this.config.maxItemsPerCategory) {
            technicalKnowledge.push(toContextItem(rec));
            totalChars += itemLength;
          }
          break;
        case MemoryCategory.TASK_CONTEXT:
          if (taskHistory.length < this.config.maxItemsPerCategory) {
            taskHistory.push(toContextItem(rec));
            totalChars += itemLength;
          }
          break;
        case MemoryCategory.LESSON_LEARNED:
          if (lessonsLearned.length < this.config.maxItemsPerCategory) {
            lessonsLearned.push(toContextItem(rec));
            totalChars += itemLength;
          }
          break;
      }
    }

    return {
      projectId,
      taskId,
      projectSummary: `Project '${projectId}' active execution context for task '${taskTitle}'`,
      decisions,
      technicalKnowledge,
      taskHistory,
      lessonsLearned,
      verifiedFactsCount: verifiedCount,
      unverifiedNotesCount: unverifiedCount,
      totalTokensApprox: Math.round(totalChars / 4),
      assembledAt: new Date().toISOString(),
    };
  }
}
