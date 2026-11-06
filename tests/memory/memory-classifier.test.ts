import { describe, it, expect } from 'vitest';
import { MemoryClassifier } from '../../src/modules/memory/extraction/memory.classifier.js';
import { MemoryCategory } from '../../src/database/types.js';

describe('Memory Classifier', () => {
  it('should classify architectural decisions', () => {
    const result = MemoryClassifier.classify(
      'Database ORM Choice',
      'We decided to use Prisma ORM with PostgreSQL and the @prisma/adapter-pg driver.',
      'DOCUMENTATION',
    );
    expect(result.category).toBe(MemoryCategory.DECISION);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify user preferences', () => {
    const result = MemoryClassifier.classify(
      'Code Style Preference',
      'The user prefers strict TypeScript with no any types and explicit return types on public methods.',
    );
    expect(result.category).toBe(MemoryCategory.USER_PREFERENCE);
  });

  it('should classify lessons learned and bug pitfalls', () => {
    const result = MemoryClassifier.classify(
      'WebSocket Memory Leak Pitfall',
      'Lesson learned: Unhandled error event listeners on EventEmitter crash Node.js process unless an error listener is explicitly bound.',
    );
    expect(result.category).toBe(MemoryCategory.LESSON_LEARNED);
  });

  it('should classify technical knowledge and API endpoints', () => {
    const result = MemoryClassifier.classify(
      'Switch Server Health API Endpoint',
      'The Switch health probe is exposed at GET /global/health on port 8000 using HTTP protocol.',
    );
    expect(result.category).toBe(MemoryCategory.TECHNICAL_KNOWLEDGE);
  });
});

