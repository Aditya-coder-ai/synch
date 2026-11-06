import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Swagger / OpenAPI Documentation', () => {
  it('should serve OpenAPI JSON specification', async () => {
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);

    const openapi = response.json();
    expect(openapi.openapi).toBe('3.0.3');
    expect(openapi.info.title).toBe('CrewFlow Backend API');
    expect(openapi.paths['/api/v1/health']).toBeDefined();
    expect(openapi.paths['/api/v1/health/ready']).toBeDefined();

    await app.close();
  });

  it('should serve Swagger UI HTML', async () => {
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/docs/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');

    await app.close();
  });
});

