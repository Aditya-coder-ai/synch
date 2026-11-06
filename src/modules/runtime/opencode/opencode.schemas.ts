import { z } from 'zod';

export const openCodeHealthSchema = z.object({
  healthy: z.boolean(),
  version: z.string(),
});

export const permissionActionSchema = z.enum(['allow', 'deny', 'ask']);

export const permissionRuleSchema = z.object({
  permission: z.string().min(1),
  pattern: z.string().min(1),
  action: permissionActionSchema,
});

export const createSessionRequestSchema = z.object({
  title: z.string().optional(),
  agent: z.string().optional(),
  model: z
    .object({
      id: z.string(),
      providerID: z.string(),
      variant: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  permission: z.array(permissionRuleSchema).optional(),
  workspaceID: z.string().optional(),
});

export const sessionResponseSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  parentID: z.string().optional(),
  createdAt: z.union([z.number(), z.string()]).optional(),
});

export const messagePartInputSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const sendMessageRequestSchema = z.object({
  parts: z.array(messagePartInputSchema).min(1),
  system: z.string().optional(),
  agent: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
});

export const sessionDiffFileSchema = z.object({
  path: z.string(),
  status: z.string().optional(),
  diff: z.string().optional(),
});

export const sessionDiffResponseSchema = z.union([
  z.array(sessionDiffFileSchema),
  z.object({
    files: z.array(sessionDiffFileSchema).optional(),
    diff: z.string().optional(),
  }),
]);

export type OpenCodeHealthResponse = z.infer<typeof openCodeHealthSchema>;
export type PermissionRule = z.infer<typeof permissionRuleSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type SessionDiffResponse = z.infer<typeof sessionDiffResponseSchema>;

