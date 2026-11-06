import type { ApiSuccessResponse, ApiErrorResponse, ApiErrorPayload } from '../types/api-response.js';

export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function errorResponse(
  error: ApiErrorPayload,
  path: string,
  timestamp?: string,
): ApiErrorResponse {
  return {
    success: false,
    error,
    timestamp: timestamp ?? new Date().toISOString(),
    path,
  };
}

