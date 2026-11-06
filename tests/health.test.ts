import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { HealthService } from '../src/modules/health/health.service.js';

describe('Health Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/health (Liveness)', () => {
    it('should return 200 with application metadata', async () => {
      const app = await buildApp({ logger: false });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);

      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('ok');
      expect(json.data.appName).toBe('CrewFlow Backend');
      expect(json.data.version).toBeDefined();
      expect(json.data.environment).toBeDefined();
      expect(typeof json.data.timestamp).toBe('string');
      expect(typeof json.data.uptimeSeconds).toBe('number');

      await app.close();
    });
  });

  describe('GET /api/v1/health/ready (Readiness)', () => {
    it('should return 200 when database connectivity is healthy', async () => {
      const mockHealthService = new HealthService({
        checkDbHealth: vi.fn().mockResolvedValue({
          status: 'up',
          latencyMs: 12,
        }),
      });

      const app = await buildApp({
        healthService: mockHealthService,
        logger: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health/ready',
      });

      expect(response.statusCode).toBe(200);

      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ready');
      expect(json.data.checks.database.status).toBe('up');
      expect(json.data.checks.database.latencyMs).toBe(12);

      await app.close();
    });

    it('should return 503 when database connectivity is down', async () => {
      const mockHealthService = new HealthService({
        checkDbHealth: vi.fn().mockResolvedValue({
          status: 'down',
          latencyMs: 50,
          error: 'Connection refused',
        }),
      });

      const app = await buildApp({
        healthService: mockHealthService,
        logger: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health/ready',
      });

      expect(response.statusCode).toBe(503);

      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.data.status).toBe('not_ready');
      expect(json.data.checks.database.status).toBe('down');
      expect(json.data.checks.database.error).toBe('Connection refused');

      await app.close();
    });
  });
});

