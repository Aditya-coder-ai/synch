import { z } from 'zod';
import { AgentRole, AgentStatus } from '../../database/types.js';

export const agentRoleSchema = z.enum([
  AgentRole.COORDINATOR,
  AgentRole.DEVELOPER,
  AgentRole.QA,
  AgentRole.REVIEWER,
]);

export const agentStatusSchema = z.enum([
  AgentStatus.ACTIVE,
  AgentStatus.IDLE,
  AgentStatus.BUSY,
  AgentStatus.PAUSED,
  AgentStatus.ERROR,
  AgentStatus.OFFLINE,
]);

export const jsonSchema = z.union([
  z.record(z.unknown()),
  z.array(z.unknown()),
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const createAgentSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  name: z.string().trim().min(1, 'Agent name is required').max(100),
  role: agentRoleSchema.default(AgentRole.DEVELOPER),
  description: z.string().trim().max(500).optional().nullable(),
  status: agentStatusSchema.default(AgentStatus.IDLE),
  capabilities: z.array(z.string().trim().min(1)).default([]),
  configuration: z
    .record(z.unknown())
    .default({})
    .refine(
      config => {
        const sensitiveKeys = ['password', 'secret', 'apiKey', 'api_key', 'token', 'private_key'];
        const keys = Object.keys(config).map(k => k.toLowerCase());
        return !sensitiveKeys.some(s => keys.includes(s.toLowerCase()));
      },
      {
        message: 'Agent configuration cannot contain secret credentials or API keys',
        path: ['configuration'],
      },
    ),
});

export const updateAgentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    role: agentRoleSchema.optional(),
    description: z.string().trim().max(500).optional().nullable(),
    status: agentStatusSchema.optional(),
    capabilities: z.array(z.string().trim().min(1)).optional(),
    configuration: z
      .record(z.unknown())
      .optional()
      .refine(
        config => {
          if (!config) return true;
          const sensitiveKeys = ['password', 'secret', 'apiKey', 'api_key', 'token', 'private_key'];
          const keys = Object.keys(config).map(k => k.toLowerCase());
          return !sensitiveKeys.some(s => keys.includes(s.toLowerCase()));
        },
        {
          message: 'Agent configuration cannot contain secret credentials or API keys',
        },
      ),
  })
  .strict();

