import { env } from '../../config/env.js';
import { checkDatabaseHealth, type DatabaseHealthResult } from '../../database/prisma.js';
import type { HealthResponseData, ReadinessResponseData } from './health.schema.js';

export interface HealthServiceDependencies {
  checkDbHealth?: () => Promise<DatabaseHealthResult>;
}

export class HealthService {
  private readonly checkDbHealth: () => Promise<DatabaseHealthResult>;

  constructor(dependencies: HealthServiceDependencies = {}) {
    this.checkDbHealth = dependencies.checkDbHealth ?? checkDatabaseHealth;
  }

  getLiveness(): HealthResponseData {
    return {
      status: 'ok',
      appName: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadiness(): Promise<{ isReady: boolean; data: ReadinessResponseData }> {
    const dbResult = await this.checkDbHealth();
    const isReady = dbResult.status === 'up';

    return {
      isReady,
      data: {
        status: isReady ? 'ready' : 'not_ready',
        checks: {
          database: {
            status: dbResult.status,
            ...(dbResult.latencyMs !== undefined ? { latencyMs: dbResult.latencyMs } : {}),
            ...(dbResult.error !== undefined ? { error: dbResult.error } : {}),
          },
        },
        timestamp: new Date().toISOString(),
      },
    };
  }
}

