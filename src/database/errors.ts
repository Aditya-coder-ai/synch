import {
  AppError,
  ConflictError,
  NotFoundError,
  BadRequestError,
  DatabaseError,
} from '../common/errors/app-error.js';

interface PrismaErrorWithCode extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

/**
 * Maps Prisma error codes to standardized domain AppErrors.
 * Prevents internal connection string and table schema leaks.
 */
export function handleDatabaseError(error: unknown, fallbackMessage = 'Database operation failed'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const prismaErr = error as PrismaErrorWithCode;

  if (prismaErr && typeof prismaErr.code === 'string') {
    switch (prismaErr.code) {
      // P2002: Unique constraint failed
      case 'P2002': {
        const target = (prismaErr.meta?.target as string[]) || 'field';
        const fields = Array.isArray(target) ? target.join(', ') : String(target);
        return new ConflictError(`A resource with this ${fields} already exists`, {
          fields: target,
        });
      }

      // P2025: An operation failed because it depends on one or more records that were required but not found
      case 'P2025':
        return new NotFoundError('Requested record was not found in database');

      // P2003: Foreign key constraint failed
      case 'P2003': {
        const fieldName = (prismaErr.meta?.field_name as string) || 'referenced entity';
        return new BadRequestError(`Referenced foreign entity does not exist: ${fieldName}`);
      }

      // P2014: Required relation violation
      case 'P2014':
        return new BadRequestError('The requested change would violate a required relationship');

      // P2000: Value too long for column
      case 'P2000':
        return new BadRequestError('Value provided exceeds the column maximum length');

      default:
        break;
    }
  }

  return new DatabaseError(fallbackMessage);
}

