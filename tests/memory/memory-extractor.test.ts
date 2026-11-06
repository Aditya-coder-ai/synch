import { describe, it, expect } from 'vitest';
import { DeterministicMemoryExtractor } from '../../src/modules/memory/extraction/memory.extractor.js';
import { MemoryCategory } from '../../src/database/types.js';

describe('Deterministic Memory Extractor', () => {
  const extractor = new DeterministicMemoryExtractor();

  it('should extract verified technical knowledge and lessons learned from verified task outcome', async () => {
    const candidates = await extractor.extractFromTaskOutcome({
      projectId: 'proj_beta',
      taskId: 'task_001',
      taskTitle: 'Implement OAuth2 Authorization Code Flow',
      filesModified: ['src/modules/auth/oauth.service.ts', 'src/modules/auth/oauth.routes.ts'],
      summary: 'Configured Google OAuth2 provider with state verification and refresh token persistence.',
      verified: true,
      notes: [
        'Lesson learned: Always validate state parameter against Redis session to prevent CSRF replay attacks.',
      ],
    });

    expect(candidates.length).toBeGreaterThanOrEqual(2);

    const techCandidate = candidates.find(c => c.category === MemoryCategory.TECHNICAL_KNOWLEDGE);
    expect(techCandidate).toBeDefined();
    expect(techCandidate?.metadata?.verified).toBe(true);
    expect(techCandidate?.metadata?.filesModified).toContain('src/modules/auth/oauth.service.ts');

    const lessonCandidate = candidates.find(c => c.category === MemoryCategory.LESSON_LEARNED);
    expect(lessonCandidate).toBeDefined();
    expect(lessonCandidate?.content).toContain('validate state parameter');
  });

  it('should not extract permanent memory from unverified or failed task outcomes', async () => {
    const candidates = await extractor.extractFromTaskOutcome({
      projectId: 'proj_beta',
      taskId: 'task_failed',
      taskTitle: 'Broken Implementation',
      filesModified: [],
      summary: 'Task did not pass evidence verification',
      verified: false,
    });

    expect(candidates).toHaveLength(0);
  });

  it('should extract decisions and preferences from structured document text', async () => {
    const docText = `
We decided to use Vitest as our primary testing framework for Fastify services.
The user prefers github-style markdown links with forward slashes for all code references.
Some random short line
`;

    const candidates = await extractor.extractFromText(
      'proj_beta',
      docText,
      'ARCHITECTURE_SPEC',
    );

    expect(candidates.length).toBe(2);
    expect(candidates.some(c => c.category === MemoryCategory.DECISION)).toBe(true);
    expect(candidates.some(c => c.category === MemoryCategory.USER_PREFERENCE)).toBe(true);
  });
});

