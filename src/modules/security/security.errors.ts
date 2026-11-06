import { AppError } from '../../common/errors/app-error.js';
import { ErrorCode } from '../../common/errors/error-codes.js';

export class SecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCode.SECURITY_ERROR, details);
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 403, ErrorCode.PERMISSION_DENIED, details);
  }
}

export class ApprovalNotFoundError extends AppError {
  constructor(approvalId: string) {
    super(`Approval with ID '${approvalId}' was not found.`, 404, ErrorCode.APPROVAL_NOT_FOUND, { approvalId });
  }
}

export class ApprovalAlreadyResolvedError extends AppError {
  constructor(approvalId: string, currentStatus: string) {
    super(
      `Approval '${approvalId}' has already been resolved with status '${currentStatus}' and cannot be altered.`,
      409,
      ErrorCode.APPROVAL_ALREADY_RESOLVED,
      { approvalId, currentStatus },
    );
  }
}

export class ApprovalExpiredError extends AppError {
  constructor(approvalId: string, expiresAt: Date) {
    super(
      `Approval '${approvalId}' expired at ${expiresAt.toISOString()} and can no longer be used.`,
      410,
      ErrorCode.APPROVAL_EXPIRED,
      { approvalId, expiresAt: expiresAt.toISOString() },
    );
  }
}

export class ApprovalDigestMismatchError extends AppError {
  constructor(approvalId: string, expectedDigest: string, actualDigest: string) {
    super(
      `Approval '${approvalId}' payload digest mismatch. The requested action payload has changed since approval.`,
      400,
      ErrorCode.APPROVAL_DIGEST_MISMATCH,
      { approvalId, expectedDigest, actualDigest },
    );
  }
}

export class ApprovalReplayDetectedError extends AppError {
  constructor(approvalId: string, executionId: string) {
    super(
      `Approval '${approvalId}' cannot be replayed for execution '${executionId}'. Approvals are single-use and execution-bound.`,
      409,
      ErrorCode.APPROVAL_REPLAY_DETECTED,
      { approvalId, executionId },
    );
  }
}

export class UnauthorizedReviewerError extends AppError {
  constructor(userId: string, reason: string) {
    super(`User '${userId}' is not authorized to review this approval: ${reason}`, 403, ErrorCode.UNAUTHORIZED_REVIEWER, {
      userId,
      reason,
    });
  }
}

export class SelfApprovalProhibitedError extends AppError {
  constructor(userId: string, actionType: string) {
    super(
      `Separation of duties policy violation: User '${userId}' cannot approve their own requested action '${actionType}'.`,
      403,
      ErrorCode.SELF_APPROVAL_PROHIBITED,
      { userId, actionType },
    );
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 403, ErrorCode.INSUFFICIENT_PERMISSIONS, details);
  }
}
