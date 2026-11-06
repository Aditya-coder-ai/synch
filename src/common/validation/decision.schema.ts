import { z } from 'zod';

export const createDecisionSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  taskId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1, 'Decision title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  rationale: z.string().trim().min(1, 'Rationale is required').max(2000),
  decidedByUserId: z.string().trim().min(1).optional().nullable(),
  decidedByAgentId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});
