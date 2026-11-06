import { AppError } from '../../../common/errors/app-error.js';
import { ErrorCode } from '../../../common/errors/error-codes.js';

export class OpenCodeError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ErrorCode.RUNTIME_ERROR,
    details?: unknown,
  ) {
    super(message, statusCode, code, details);
    this.name = 'OpenCodeError';
  }
}

export class OpenCodeConnectionError extends OpenCodeError {
  constructor(message: string, details?: unknown) {
    super(message, 503, ErrorCode.OPENCODE_CONNECTION_ERROR, details);
    this.name = 'OpenCodeConnectionError';
  }
}

export class OpenCodeUnavailableError extends OpenCodeError {
  constructor(message: string = 'OpenCode runtime server is unavailable', details?: unknown) {
    super(message, 503, ErrorCode.OPENCODE_UNAVAILABLE, details);
    this.name = 'OpenCodeUnavailableError';
  }
}

export class OpenCodeTimeoutError extends OpenCodeError {
  constructor(message: string = 'OpenCode execution exceeded timeout limit', details?: unknown) {
    super(message, 504, ErrorCode.OPENCODE_TIMEOUT, details);
    this.name = 'OpenCodeTimeoutError';
  }
}

export class OpenCodeSessionError extends OpenCodeError {
  constructor(message: string, details?: unknown) {
    super(message, 500, ErrorCode.OPENCODE_SESSION_ERROR, details);
    this.name = 'OpenCodeSessionError';
  }
}

export class WorkspaceSecurityError extends OpenCodeError {
  constructor(message: string, details?: unknown) {
    super(message, 403, ErrorCode.WORKSPACE_SECURITY_ERROR, details);
    this.name = 'WorkspaceSecurityError';
  }
}

export class PermissionDeniedError extends OpenCodeError {
  constructor(message: string, details?: unknown) {
    super(message, 403, ErrorCode.PERMISSION_DENIED, details);
    this.name = 'PermissionDeniedError';
  }
}

export class VerificationFailedError extends OpenCodeError {
  constructor(message: string, details?: unknown) {
    super(message, 422, ErrorCode.VERIFICATION_FAILED, details);
    this.name = 'VerificationFailedError';
  }
}

