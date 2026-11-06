import { z } from 'zod';
import { MemoryCategory } from '../../database/types.js';

export const memoryCategorySchema = z.enum([
  MemoryCategory.PROJECT_CONTEXT,
  MemoryCategory.USER_PREFERENCE,
  MemoryCategory.DECISION,
  MemoryCategory.TECHNICAL_KNOWLEDGE,
  MemoryCategory.TASK_CONTEXT,
  MemoryCategory.LESSON_LEARNED,
]);

export const createMemoryEntrySchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  taskId: z.string().trim().min(1).optional().nullable(),
  category: memoryCategorySchema.default(MemoryCategory.PROJECT_CONTEXT),
  title: z.string().trim().min(1, 'Memory title is required').max(200),
  content: z.string().trim().min(1, 'Memory content is required').max(10000),
  sourceType: z.string().trim().min(1, 'Source type is required').max(50),
  sourceId: z.string().trim().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const updateMemoryEntrySchema = z
  .object({
    category: memoryCategorySchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(10000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

