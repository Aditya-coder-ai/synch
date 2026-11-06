import { describe, it, expect } from 'vitest';
import { handleDatabaseError } from '../src/database/errors.js';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  DatabaseError,
  AppError,
} from '../src/common/errors/app-error.js';

describe('Database Error Handler & Mapping', () => {
  it('should return existing AppError instances unmodified', () => {
    const existing = new NotFoundError('Custom not found');
    const result = handleDatabaseError(existing);
    expect(result).toBe(existing);
  });

  it('should map Prisma P2002 (unique constraint violation) to ConflictError', () => {
    const prismaErr = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['email'] },
    });

    const result = handleDatabaseError(prismaErr);
    expect(result).toBeInstanceOf(ConflictError);
    expect(result.statusCode).toBe(409);
    expect(result.message).toContain('email');
  });

  it('should map Prisma P2025 (record not found) to NotFoundError', () => {
    const prismaErr = Object.assign(new Error('Record to update not found'), {
      code: 'P2025',
    });

    const result = handleDatabaseError(prismaErr);
    expect(result).toBeInstanceOf(NotFoundError);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe('Requested record was not found in database');
  });

  it('should map Prisma P2003 (foreign key failure) to BadRequestError', () => {
    const prismaErr = Object.assign(new Error('Foreign key constraint failed'), {
      code: 'P2003',
      meta: { field_name: 'workspaceId' },
    });

    const result = handleDatabaseError(prismaErr);
    expect(result).toBeInstanceOf(BadRequestError);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain('workspaceId');
  });

  it('should map Prisma P2014 (required relation violation) to BadRequestError', () => {
    const prismaErr = Object.assign(new Error('Required relation violation'), {
      code: 'P2014',
    });

    const result = handleDatabaseError(prismaErr);
    expect(result).toBeInstanceOf(BadRequestError);
    expect(result.statusCode).toBe(400);
  });

  it('should map generic or unknown errors to DatabaseError without leaking credentials', () => {
    const secretError = new Error(
      'connection to postgresql://postgres:SuperSecretPassword123@aws.supabase.com:5432 failed',
    );

    const result = handleDatabaseError(secretError, 'Custom fallback message');
    expect(result).toBeInstanceOf(DatabaseError);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe('Custom fallback message');
    expect(JSON.stringify(result)).not.toContain('SuperSecretPassword123');
  });
});
