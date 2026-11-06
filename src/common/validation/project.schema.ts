import { z } from 'zod';
import { ProjectStatus } from '../../database/types.js';

export const projectStatusSchema = z.enum([
  ProjectStatus.PLANNING,
  ProjectStatus.ACTIVE,
  ProjectStatus.PAUSED,
  ProjectStatus.COMPLETED,
  ProjectStatus.ARCHIVED,
]);

export const createProjectSchema = z.object({
  workspaceId: z.string().trim().min(1, 'Workspace ID is required'),
  name: z.string().trim().min(1, 'Project name is required').max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  status: projectStatusSchema.default(ProjectStatus.PLANNING),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    status: projectStatusSchema.optional(),
    archivedAt: z.coerce.date().optional().nullable(),
  })
  .strict();
