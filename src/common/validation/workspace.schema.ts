import { z } from 'zod';
import { WorkspaceRole } from '../../database/types.js';

export const workspaceRoleSchema = z.enum([
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
]);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required'),
  role: workspaceRoleSchema.default(WorkspaceRole.MEMBER),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  role: workspaceRoleSchema,
});

