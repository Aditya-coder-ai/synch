import type { CandidateMemory } from '../memory.types.js';
import { MemoryClassifier } from './memory.classifier.js';
import { MemoryValidator } from './memory.validator.js';
import { MemoryCategory } from '../../../database/types.js';

export interface VerifiedTaskOutcome {
  projectId: string;
  taskId: string;
  taskTitle: string;
  filesModified: string[];
  summary: string;
  verified: boolean;
  notes?: string[];
}

export interface IMemoryExtractor {
  extractFromTaskOutcome(outcome: VerifiedTaskOutcome): Promise<CandidateMemory[]>;
  extractFromText(
    projectId: string,
    text: string,
    sourceType: string,
    sourceId?: string,
  ): Promise<CandidateMemory[]>;
}

export class DeterministicMemoryExtractor implements IMemoryExtractor {
  /**
   * Extracts candidate memories from verified task outcomes.
   */
  async extractFromTaskOutcome(outcome: VerifiedTaskOutcome): Promise<CandidateMemory[]> {
    const candidates: CandidateMemory[] = [];

    if (!outcome.verified) {
      // Do not promote unverified outcomes to permanent high-confidence memory
      return candidates;
    }

    // 1. Technical Knowledge from verified modifications
    if (outcome.filesModified.length > 0) {
      const title = `Verified Implementation: ${outcome.taskTitle}`;
      const content = `Task '${outcome.taskTitle}' verified successfully. Modified files: ${outcome.filesModified.join(', ')}. ${outcome.summary}`;

      const candidate: CandidateMemory = {
        projectId: outcome.projectId,
        taskId: outcome.taskId,
        category: MemoryCategory.TECHNICAL_KNOWLEDGE,
        title,
        content,
        sourceType: 'VERIFIED_EXECUTION',
        sourceId: outcome.taskId,
        metadata: {
          verified: true,
          confidence: 0.95,
          filesModified: outcome.filesModified,
        },
      };

      const validation = MemoryValidator.validate(candidate);
      if (validation.valid && validation.sanitizedMemory) {
        candidates.push(validation.sanitizedMemory);
      }
    }

    // 2. Extract lessons learned from outcome notes if any
    if (outcome.notes && outcome.notes.length > 0) {
      for (const note of outcome.notes) {
        const classification = MemoryClassifier.classify(outcome.taskTitle, note, 'VERIFIED_EXECUTION');
        const candidate: CandidateMemory = {
          projectId: outcome.projectId,
          taskId: outcome.taskId,
          category: classification.category,
          title: `Insight from: ${outcome.taskTitle.slice(0, 50)}`,
          content: note,
          sourceType: 'VERIFIED_EXECUTION',
          sourceId: outcome.taskId,
          metadata: {
            verified: true,
            confidence: classification.confidence,
          },
        };

        const validation = MemoryValidator.validate(candidate);
        if (validation.valid && validation.sanitizedMemory) {
          candidates.push(validation.sanitizedMemory);
        }
      }
    }

    return candidates;
  }

  /**
   * Extracts candidate memories from unstructured human instruction or document text.
   */
  async extractFromText(
    projectId: string,
    text: string,
    sourceType: string,
    sourceId?: string,
  ): Promise<CandidateMemory[]> {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 15);

    const candidates: CandidateMemory[] = [];

    for (const line of lines) {
      const classification = MemoryClassifier.classify(line.slice(0, 40), line, sourceType);

      // Only extract lines that represent clear decisions, preferences, or technical rules
      if (
        classification.category === MemoryCategory.DECISION ||
        classification.category === MemoryCategory.USER_PREFERENCE ||
        classification.category === MemoryCategory.TECHNICAL_KNOWLEDGE
      ) {
        const candidate: CandidateMemory = {
          projectId,
          category: classification.category,
          title: line.slice(0, 60),
          content: line,
          sourceType,
          sourceId: sourceId || null,
          metadata: {
            verified: sourceType === 'PROJECT_DECISION',
            confidence: classification.confidence,
          },
        };

        const validation = MemoryValidator.validate(candidate);
        if (validation.valid && validation.sanitizedMemory) {
          candidates.push(validation.sanitizedMemory);
        }
      }
    }

    return candidates;
  }
}
