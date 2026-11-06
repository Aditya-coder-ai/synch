import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';
import { ErrorCode } from './error-codes.js';
import type { ApiErrorResponse } from '../types/api-response.js';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const timestamp = new Date().toISOString();
  const path = request.url;

  // 1. Handled AppError instances
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      timestamp,
      path,
    };

    if (error.statusCode >= 500) {
      request.log.error({ err: error, path }, error.message);
    } else {
      request.log.warn({ err: error, path }, error.message);
    }

    return reply.status(error.statusCode).send(response);
  }

  // 2. Direct Zod validation error
  if (error instanceof ZodError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      timestamp,
      path,
    };
    request.log.warn({ validation: response.error.details, path }, 'Validation error');
    return reply.status(400).send(response);
  }

  // 3. Fastify Schema Validation Error
  const fastifyErr = error as FastifyError;
  if (fastifyErr.validation) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: fastifyErr.validation,
      },
      timestamp,
      path,
    };
    request.log.warn({ validation: fastifyErr.validation, path }, 'Fastify schema validation error');
    return reply.status(400).send(response);
  }

  // 4. Fastify Payload Too Large
  if (fastifyErr.statusCode === 413 || fastifyErr.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the maximum permitted limit',
      },
      timestamp,
      path,
    };
    return reply.status(413).send(response);
  }

  // 5. Prisma / Database Errors (without leaking connection strings or credentials)
  if (error.name?.startsWith('PrismaClient')) {
    request.log.error({ err: error, path }, 'Database error occurred');
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message: 'A database error occurred',
      },
      timestamp,
      path,
    };
    return reply.status(500).send(response);
  }

  // 6. Generic or Unknown Error
  const statusCode = typeof fastifyErr.statusCode === 'number' && fastifyErr.statusCode >= 400
    ? fastifyErr.statusCode
    : 500;

  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : error.message || 'Internal Server Error';

  request.log.error({ err: error, path }, 'Unhandled error');

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message,
    },
    timestamp,
    path,
  };

  return reply.status(statusCode).send(response);
}

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): FastifyReply {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${request.method} ${request.url} not found`,
    },
    timestamp: new Date().toISOString(),
    path: request.url,
  };

  return reply.status(404).send(response);
}

