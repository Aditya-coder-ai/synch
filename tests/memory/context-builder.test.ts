import { describe, it, expect, vi } from 'vitest';
import { ContextBuilder } from '../../src/modules/memory/context/context.builder.js';
import { MemoryRetriever } from '../../src/modules/memory/retrieval/memory.retriever.js';
import { MemoryCategory } from '../../src/database/types.js';

describe('Context Builder', () => {
  const mockRetriever = {
    retrieve: vi.fn().mockResolvedValue([
      {
        memory: {
          id: 'mem_1',
          projectId: 'proj_ctx',
          category: MemoryCategory.DECISION,
          title: 'Use Zod for all request schemas',
          content: 'All input endpoints must validate request body and query using strict Zod schemas.',
          sourceType: 'PROJECT_DECISION',
          metadata: { verified: true, confidence: 0.95 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score: 95,
        matchReasons: ['Verified decision'],
      },
      {
        memory: {
          id: 'mem_2',
          projectId: 'proj_ctx',
          category: MemoryCategory.TECHNICAL_KNOWLEDGE,
          title: 'Fastify Port Configuration',
          content: 'Server listens on HOST 0.0.0.0 and PORT 3000.',
          sourceType: 'TECHNICAL_SPEC',
          metadata: { verified: true, confidence: 0.9 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score: 85,
        matchReasons: ['Technical match'],
      },
      {
        memory: {
          id: 'mem_3',
          projectId: 'proj_ctx',
          category: MemoryCategory.LESSON_LEARNED,
          title: 'Unhandled Rejection Logging',
          content: 'Always listen for unhandledRejection to avoid silent server termination.',
          sourceType: 'LESSON',
          metadata: { verified: false, confidence: 0.7 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score: 65,
        matchReasons: ['Lesson note'],
      },
    ]),
  } as unknown as MemoryRetriever;

  it('should assemble structured agent context with distinct verified and unverified counts', async () => {
    const builder = new ContextBuilder({ retriever: mockRetriever });

    const context = await builder.buildContext(
      'proj_ctx',
      'task_01',
      'Implement Auth Routes',
      ['Zod', 'validation'],
    );

    expect(context.projectId).toBe('proj_ctx');
    expect(context.taskId).toBe('task_01');
    expect(context.decisions).toHaveLength(1);
    expect(context.decisions[0].title).toBe('Use Zod for all request schemas');
    expect(context.technicalKnowledge).toHaveLength(1);
    expect(context.lessonsLearned).toHaveLength(1);

    expect(context.verifiedFactsCount).toBe(2);
    expect(context.unverifiedNotesCount).toBe(1);
    expect(context.totalTokensApprox).toBeGreaterThan(0);
  });

  it('should strictly enforce context character limits', async () => {
    const builder = new ContextBuilder({
      retriever: mockRetriever,
      config: {
        maxContextCharacters: 80, // Very small budget
      },
    });

    const context = await builder.buildContext(
      'proj_ctx',
      'task_01',
      'Implement Auth Routes',
    );

    // Items that exceed character limit must be omitted
    const totalItems =
      context.decisions.length +
      context.technicalKnowledge.length +
      context.lessonsLearned.length;
    expect(totalItems).toBeLessThanOrEqual(2);
  });
});

