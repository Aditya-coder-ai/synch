import { z } from 'zod';

export const healthResponseDataSchema = z.object({
  status: z.string().describe('Status indicator (e.g. ok)'),
  appName: z.string().describe('Application name'),
  version: z.string().describe('Application semver version'),
  environment: z.string().describe('Current deployment environment'),
  timestamp: z.string().describe('ISO 8601 timestamp of request execution'),
  uptimeSeconds: z.number().describe('Process uptime in seconds'),
});

export const healthResponseSchema = z.object({
  success: z.literal(true),
  data: healthResponseDataSchema,
});

export const databaseCheckSchema = z.object({
  status: z.enum(['up', 'down']),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

export const readinessResponseDataSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.object({
    database: databaseCheckSchema,
  }),
  timestamp: z.string(),
});

export const readinessResponseSchema = z.object({
  success: z.boolean(),
  data: readinessResponseDataSchema,
});

export type HealthResponseData = z.infer<typeof healthResponseDataSchema>;
export type ReadinessResponseData = z.infer<typeof readinessResponseDataSchema>;

