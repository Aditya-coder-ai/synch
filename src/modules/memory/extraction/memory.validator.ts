import type { CandidateMemory } from '../memory.types.js';

export interface MemoryValidationResult {
  valid: boolean;
  sanitizedMemory?: CandidateMemory;
  rejectionReason?: string;
}

export class MemoryValidator {
  private static readonly TRANSIENT_PATTERNS = [
    /^(?:(?:ok|okay|thanks|thank you|got it|sounds good|cool|done|test|testing)\s*)+$/i,
    /^(?:hello|hi|hey|bye|goodbye|what's up)$/i,
    /^(?:i think maybe|perhaps we could|not sure if|maybe later)/i,
  ];

  /**
   * Redacts sensitive credentials, secrets, tokens, and database connection strings.
   */
  public static sanitizeSecrets(text: string): string {
    if (!text) return '';

    return text
      .replace(/(?:password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?([^"',\s]+)/gi, '$1: [REDACTED]')
      .replace(/(?:bearer\s+)([a-zA-Z0-9_\-\.]{20,})/gi, 'Bearer [REDACTED]')
      .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs, '[REDACTED PRIVATE KEY]')
      .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi, 'postgresql://[REDACTED_USER]:[REDACTED_PW]@[HOST]');
  }

  /**
   * Validates a candidate memory before admission into persistent storage.
   */
  public static validate(candidate: CandidateMemory): MemoryValidationResult {
    if (!candidate.projectId || typeof candidate.projectId !== 'string') {
      return { valid: false, rejectionReason: 'Project ID is required' };
    }

    if (!candidate.category) {
      return { valid: false, rejectionReason: 'Memory category is required' };
    }

    if (!candidate.title || candidate.title.trim().length < 3) {
      return { valid: false, rejectionReason: 'Memory title must be at least 3 characters' };
    }

    if (!candidate.content || candidate.content.trim().length < 5) {
      return { valid: false, rejectionReason: 'Memory content must be at least 5 characters' };
    }

    const trimmedContent = candidate.content.trim();

    // Check for transient conversational noise
    for (const pattern of this.TRANSIENT_PATTERNS) {
      if (pattern.test(trimmedContent)) {
        return {
          valid: false,
          rejectionReason: `Rejected transient conversational noise matching pattern '${pattern.source}'`,
        };
      }
    }

    // Sanitize title and content against secret leaks
    const sanitizedTitle = this.sanitizeSecrets(candidate.title.trim());
    const sanitizedContent = this.sanitizeSecrets(candidate.content.trim());

    return {
      valid: true,
      sanitizedMemory: {
        ...candidate,
        title: sanitizedTitle,
        content: sanitizedContent,
        metadata: {
          verified: candidate.metadata?.verified ?? false,
          confidence: candidate.metadata?.confidence ?? 0.8,
          ...candidate.metadata,
        },
      },
    };
  }
}
