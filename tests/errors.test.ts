import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildApp } from '../src/app.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
} from '../src/common/errors/app-error.js';
import { ErrorCode } from '../src/common/errors/error-codes.js';

describe('Centralized Error Handling & Not Found', () => {
  it('should return standardized 404 response for unknown routes', async () => {
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/unknown-endpoint',
    });

    expect(response.statusCode).toBe(404);

    const json = response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(json.error.message).toContain('/api/v1/unknown-endpoint');
    expect(typeof json.timestamp).toBe('string');
    expect(json.path).toBe('/api/v1/unknown-endpoint');

    await app.close();
  });

  it('should handle custom AppErrors with correct status codes and codes', async () => {
    const app = await buildApp({ logger: false });

    // Register test endpoints that throw specific AppErrors
    app.get('/test/bad-request', async () => {
      throw new BadRequestError('Invalid input parameter', { field: 'name' });
    });

    app.get('/test/not-found', async () => {
      throw new NotFoundError('Project was not found');
    });

    app.get('/test/forbidden', async () => {
      throw new ForbiddenError('Action not allowed');
    });

    app.get('/test/conflict', async () => {
      throw new ConflictError('Workspace slug already in use');
    });

    app.get('/test/unavailable', async () => {
      throw new ServiceUnavailableError('AI agent runtime unreachable');
    });

    // 1. Bad Request
    const resBadRequest = await app.inject({ method: 'GET', url: '/test/bad-request' });
    expect(resBadRequest.statusCode).toBe(400);
    expect(resBadRequest.json()).toMatchObject({
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Invalid input parameter',
        details: { field: 'name' },
      },
    });

    // 2. Not Found
    const resNotFound = await app.inject({ method: 'GET', url: '/test/not-found' });
    expect(resNotFound.statusCode).toBe(404);
    expect(resNotFound.json().error.code).toBe(ErrorCode.NOT_FOUND);

    // 3. Forbidden
    const resForbidden = await app.inject({ method: 'GET', url: '/test/forbidden' });
    expect(resForbidden.statusCode).toBe(403);
    expect(resForbidden.json().error.code).toBe(ErrorCode.FORBIDDEN);

    // 4. Conflict
    const resConflict = await app.inject({ method: 'GET', url: '/test/conflict' });
    expect(resConflict.statusCode).toBe(409);
    expect(resConflict.json().error.code).toBe(ErrorCode.CONFLICT);

    // 5. Service Unavailable
    const resUnavailable = await app.inject({ method: 'GET', url: '/test/unavailable' });
    expect(resUnavailable.statusCode).toBe(503);
    expect(resUnavailable.json().error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);

    await app.close();
  });

  it('should format schema validation errors with code VALIDATION_ERROR and 400 status', async () => {
    const app = await buildApp({ logger: false });

    app.withTypeProvider<ZodTypeProvider>().post(
      '/test/validate',
      {
        schema: {
          body: z.object({
            email: z.string().email(),
            count: z.number().int().min(1),
          }),
        },
      },
      async request => ({ received: request.body }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/test/validate',
      payload: {
        email: 'invalid-email',
        count: -5,
      },
    });

    expect(response.statusCode).toBe(400);

    const json = response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(json.error.message).toBe('Request validation failed');
    expect(json.error.details).toBeDefined();

    await app.close();
  });

  it('should sanitize Prisma database errors and prevent secret leakage', async () => {
    const app = await buildApp({ logger: false });

    app.get('/test/db-crash', async () => {
      const err = new Error('FATAL: password authentication failed for user "postgres"');
      err.name = 'PrismaClientInitializationError';
      throw err;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test/db-crash',
    });

    expect(response.statusCode).toBe(500);

    const json = response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(json.error.message).toBe('A database error occurred');
    // Ensure raw database error / credentials are not leaked
    expect(JSON.stringify(json)).not.toContain('password authentication failed');

    await app.close();
  });
});

