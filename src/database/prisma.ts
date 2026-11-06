import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
      log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(client?: PrismaClient): Promise<DatabaseHealthResult> {
  if (!env.DATABASE_URL) {
    return {
      status: 'down',
      error: 'DATABASE_URL environment variable is not configured',
    };
  }

  const db = client ?? getPrismaClient();
  const startTime = Date.now();

  try {
    // Fast ping query: SELECT 1
    await db.$queryRawUnsafe('SELECT 1');
    const latencyMs = Date.now() - startTime;
    return {
      status: 'up',
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Database ping query failed';
    return {
      status: 'down',
      latencyMs,
      error: errorMessage,
    };
  }
}

