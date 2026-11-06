import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  APP_NAME: z.string().default('CrewFlow Backend'),
  APP_VERSION: z.string().default('0.1.0'),
  CORS_ORIGIN: z.string().default('*'),
  BODY_LIMIT: z.coerce.number().int().positive().default(1048576), // 1MB default
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(customEnv: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(customEnv);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }

  return result.data;
}

export function parseCorsOrigins(corsOrigin: string): boolean | string | string[] {
  if (!corsOrigin || corsOrigin === '*') {
    return true;
  }
  const origins = corsOrigin
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0]! : origins;
}

export const env = validateEnv();

