import { describe, it, expect, vi } from 'vitest';
import { MemoryRetriever } from '../../src/modules/memory/retrieval/memory.retriever.js';
import { MemoryRepository } from '../../src/modules/memory/storage/memory.repository.js';
import { MemoryCategory } from '../../src/database/types.js';
import type { MemoryRecord } from '../../src/modules/memory/memory.types.js';

describe('Memory Retrieval & Cross-Project Isolation', () => {
  const projectA_Memories: MemoryRecord[] = [
    {
      id: 'mem_a_1',
      projectId: 'proj_A',
      category: MemoryCategory.DECISION,
      title: 'Database Driver Selection',
      content: 'Project A uses Prisma with PostgreSQL and connection pooling.',
      sourceType: 'PROJECT_DECISION',
      metadata: { verified: true, confidence: 0.95 },
      createdAt: new Date('2026-11-06T10:00:00Z'),
      updatedAt: new Date('2026-11-06T10:00:00Z'),
    },
    {
      id: 'mem_a_2',
      projectId: 'proj_A',
      category: MemoryCategory.TECHNICAL_KNOWLEDGE,
      title: 'Authentication Strategy',
      content: 'JWT access tokens expire after 15 minutes, refresh tokens expire in 7 days.',
      sourceType: 'TECHNICAL_SPEC',
      metadata: { verified: true, confidence: 0.9 },
      createdAt: new Date('2026-11-06T12:00:00Z'),
      updatedAt: new Date('2026-11-06T12:00:00Z'),
    },
  ];

  const projectB_Memories: MemoryRecord[] = [
    {
      id: 'mem_b_1',
      projectId: 'proj_B',
      category: MemoryCategory.TECHNICAL_KNOWLEDGE,
      title: 'Proprietary Secret Algorithm',
      content: 'Project B secret formula: confidential parameters and internal tokens.',
      sourceType: 'CONFIDENTIAL',
      metadata: { verified: true, confidence: 1.0 },
      createdAt: new Date('2026-11-06T14:00:00Z'),
      updatedAt: new Date('2026-11-06T14:00:00Z'),
    },
  ];

  const mockRepository = {
    findMany: vi.fn().mockImplementation(async query => {
      if (query.projectId === 'proj_A') return projectA_Memories;
      if (query.projectId === 'proj_B') return projectB_Memories;
      return [];
    }),
  } as unknown as MemoryRepository;

  const retriever = new MemoryRetriever({ repository: mockRepository });

  it('should strictly isolate memories and never leak Project B context into Project A queries', async () => {
    const results = await retriever.retrieve({
      projectId: 'proj_A',
      keywords: ['secret', 'formula', 'database'],
    });

    const returnedIds = results.map(r => r.memory.id);
    expect(returnedIds).toContain('mem_a_1');
    expect(returnedIds).not.toContain('mem_b_1');

    for (const r of results) {
      expect(r.memory.projectId).toBe('proj_A');
      expect(r.memory.content).not.toContain('confidential parameters');
    }
  });

  it('should score and rank matching memories higher based on keyword relevance and verification', async () => {
    const results = await retriever.retrieve({
      projectId: 'proj_A',
      keywords: ['Prisma', 'PostgreSQL', 'pooling'],
    });

    expect(results.length).toBeGreaterThan(0);
    const topMatch = results[0];
    expect(topMatch.memory.id).toBe('mem_a_1');
    expect(topMatch.score).toBeGreaterThan(60);
    expect(topMatch.matchReasons.some(r => r.includes('Matched'))).toBe(true);
    expect(topMatch.matchReasons.some(r => r.includes('Verified fact'))).toBe(true);
  });
});
