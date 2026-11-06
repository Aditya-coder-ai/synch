import { MemoryCategory } from '../../../database/types.js';

export interface ClassificationResult {
  category: MemoryCategory;
  confidence: number;
  reason: string;
}

export class MemoryClassifier {
  /**
   * Classifies memory candidate text into the appropriate MemoryCategory.
   */
  public static classify(title: string, content: string, sourceType?: string): ClassificationResult {
    const text = `${title} ${content}`.toLowerCase();

    // 1. Provenance hints
    if (sourceType === 'PROJECT_DECISION') {
      return {
        category: MemoryCategory.DECISION,
        confidence: 0.95,
        reason: 'Explicit project decision provenance',
      };
    }

    // 2. Decision markers
    if (
      text.includes('decided to') ||
      text.includes('decision:') ||
      text.includes('architectural choice') ||
      text.includes('agreed upon') ||
      text.includes('we will use')
    ) {
      return {
        category: MemoryCategory.DECISION,
        confidence: 0.9,
        reason: 'Explicit decision phrasing detected',
      };
    }

    // 3. User preference markers
    if (
      text.includes('prefer') ||
      text.includes('always use') ||
      text.includes('user wants') ||
      text.includes('coding style') ||
      text.includes('format preference')
    ) {
      return {
        category: MemoryCategory.USER_PREFERENCE,
        confidence: 0.85,
        reason: 'User preference keywords detected',
      };
    }

    // 4. Lessons learned markers
    if (
      text.includes('lesson learned') ||
      text.includes('gotcha') ||
      text.includes('bug caused by') ||
      text.includes('pitfall') ||
      text.includes('failed because') ||
      text.includes('beware of')
    ) {
      return {
        category: MemoryCategory.LESSON_LEARNED,
        confidence: 0.9,
        reason: 'Lesson learned / failure mitigation pattern detected',
      };
    }

    // 5. Technical knowledge markers
    if (
      text.includes('api endpoint') ||
      text.includes('database schema') ||
      text.includes('port ') ||
      text.includes('library version') ||
      text.includes('framework') ||
      text.includes('protocol') ||
      text.includes('interface definition')
    ) {
      return {
        category: MemoryCategory.TECHNICAL_KNOWLEDGE,
        confidence: 0.85,
        reason: 'Technical knowledge and system interface terminology detected',
      };
    }

    // 6. Task context markers
    if (text.includes('task requirement') || text.includes('acceptance criteria') || text.includes('deliverable')) {
      return {
        category: MemoryCategory.TASK_CONTEXT,
        confidence: 0.8,
        reason: 'Task execution context detected',
      };
    }

    // Default to Project Context
    return {
      category: MemoryCategory.PROJECT_CONTEXT,
      confidence: 0.7,
      reason: 'General project context fallback',
    };
  }
}

