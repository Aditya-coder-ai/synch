import path from 'node:path';
import { z } from 'zod';

export const runtimeConfigSchema = z.object({
  provider: z.enum(['MOCK', 'OPENCODE']).default('MOCK'),
  baseUrl: z.string().url().default('http://127.0.0.1:4096'),
  username: z.string().default('opencode'),
  password: z.string().optional(),
  timeoutMs: z.coerce.number().int().min(1000).max(300000).default(30000),
  autoApprove: z.boolean().default(false),
  workspaceRoot: z.string().default('./workspaces'),
  maxOutputBytes: z.coerce.number().int().min(1024).max(1048576).default(65536),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function parseRuntimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  const envConfig: Partial<RuntimeConfig> = {
    provider: (process.env.EXECUTION_PROVIDER as 'MOCK' | 'OPENCODE') || 'MOCK',
    baseUrl: process.env.OPENCODE_BASE_URL || 'http://127.0.0.1:4096',
    username: process.env.OPENCODE_SERVER_USERNAME || 'opencode',
    password: process.env.OPENCODE_SERVER_PASSWORD || undefined,
    timeoutMs: process.env.OPENCODE_TIMEOUT_MS ? Number(process.env.OPENCODE_TIMEOUT_MS) : 30000,
    autoApprove: process.env.OPENCODE_AUTO_APPROVE === 'true',
    workspaceRoot: path.resolve(process.env.WORKSPACE_ROOT_PATH || './workspaces'),
    maxOutputBytes: process.env.OPENCODE_MAX_OUTPUT_BYTES
      ? Number(process.env.OPENCODE_MAX_OUTPUT_BYTES)
      : 65536,
    ...overrides,
  };

  return runtimeConfigSchema.parse(envConfig);
}

