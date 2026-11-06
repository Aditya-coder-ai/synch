import type { MemoryCategory } from '../../database/types.js';

export interface MemoryMetadata {
  verified?: boolean;
  confidence?: number; // 0 to 1
  tags?: string[];
  supersededBy?: string;
  sourceContext?: string;
  authorId?: string;
  archived?: boolean;
  archivedReason?: string;
  [key: string]: unknown;
}

export interface CandidateMemory {
  projectId: string;
  taskId?: string | null;
  category: MemoryCategory;
  title: string;
  content: string;
  sourceType: string; // 'VERIFIED_EXECUTION', 'PROJECT_DECISION', 'USER_INSTRUCTION', 'DOCUMENTATION'
  sourceId?: string | null;
  metadata?: MemoryMetadata;
}

export interface MemoryRecord {
  id: string;
  projectId: string;
  taskId?: string | null;
  category: MemoryCategory;
  title: string;
  content: string;
  sourceType: string;
  sourceId?: string | null;
  metadata: MemoryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchQuery {
  projectId: string;
  taskId?: string;
  categories?: MemoryCategory[];
  keywords?: string[];
  limit?: number;
  minConfidence?: number;
  verifiedOnly?: boolean;
  includeArchived?: boolean;
}

export interface RankedMemory {
  memory: MemoryRecord;
  score: number; // 0 to 100
  matchReasons: string[];
}

