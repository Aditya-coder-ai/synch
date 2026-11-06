import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '../../src/modules/memory/storage/memory.service.js';
import { MemoryRepository } from '../../src/modules/memory/storage/memory.repository.js';
import { MemoryUpdater } from '../../src/modules/memory/maintenance/memory.updater.js';
import { MemoryCategory } from '../../src/database/types.js';
import type { CandidateMemory, MemoryRecord } from '../../src/modules/memory/memory.types.js';
import { AppError } from '../../src/common/errors/app-error.js';

describe('Memory Service & Conflict Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const existingRecord: MemoryRecord = {
    id: 'mem_stored_01',
    projectId: 'proj_srv',
    category: MemoryCategory.DECISION,
    title: 'PostgreSQL Database Architecture',
    content: 'Relational data models are normalized and managed through Prisma ORM.',
    sourceType: 'PROJECT_DECISION',
    metadata: { verified: true, confidence: 1.0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
  } as unknown as MemoryRepository;

  const service = new MemoryService({ repository: mockRepository });
  const updater = new MemoryUpdater(mockRepository);

  it('should store candidate memory successfully when unique', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([]);
    vi.mocked(mockRepository.create).mockResolvedValue(existingRecord);

    const candidate: CandidateMemory = {
      projectId: 'proj_srv',
      category: MemoryCategory.DECISION,
      title: 'PostgreSQL Database Architecture',
      content: 'Relational data models are normalized and managed through Prisma ORM.',
      sourceType: 'PROJECT_DECISION',
    };

    const stored = await service.storeMemory(candidate);
    expect(stored.id).toBe('mem_stored_01');
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should detect duplicate memory and avoid creating redundant records', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([existingRecord]);

    const duplicateCandidate: CandidateMemory = {
      projectId: 'proj_srv',
      category: MemoryCategory.DECISION,
      title: 'PostgreSQL Database Architecture',
      content: 'Relational data models are normalized and managed through Prisma ORM.',
      sourceType: 'PROJECT_DECISION',
    };

    const stored = await service.storeMemory(duplicateCandidate);
    expect(stored.id).toBe('mem_stored_01');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should prevent an unverified assertion from overwriting an established verified decision', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(existingRecord);

    await expect(
      updater.updateMemory('proj_srv', 'mem_stored_01', {
        title: 'Switch to MongoDB',
        content: 'I think we might use MongoDB instead of Postgres.',
        metadata: { verified: false },
      }),
    ).rejects.toThrow(AppError);
  });
});
