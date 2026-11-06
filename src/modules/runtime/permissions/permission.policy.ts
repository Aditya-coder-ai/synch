export const OperationCategory = {
  READ_ONLY: 'READ_ONLY',
  FILE_MODIFICATION: 'FILE_MODIFICATION',
  TEST_EXECUTION: 'TEST_EXECUTION',
  COMMAND_EXECUTION: 'COMMAND_EXECUTION',
  DESTRUCTIVE_OPERATION: 'DESTRUCTIVE_OPERATION',
  SENSITIVE_OPERATION: 'SENSITIVE_OPERATION',
} as const;

export type OperationCategoryType =
  (typeof OperationCategory)[keyof typeof OperationCategory];

export interface OperationRequest {
  category: OperationCategoryType;
  action: string;
  target?: string;
  payload?: Record<string, unknown>;
}

export interface PermissionEvaluation {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reason: string;
}

export class PermissionPolicy {
  /**
   * Evaluates an operation request based on least privilege and safety constraints.
   */
  public static evaluate(request: OperationRequest): PermissionEvaluation {
    // 1. Sensitive operations strictly require human approval (default-deny for automated execution)
    if (request.category === OperationCategory.SENSITIVE_OPERATION) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `Operation '${request.action}' modifies sensitive files or production configurations and requires human approval.`,
      };
    }

    if (request.category === OperationCategory.DESTRUCTIVE_OPERATION) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `Destructive operation '${request.action}' on '${request.target || 'workspace'}' requires explicit human authorization.`,
      };
    }

    // 2. Prohibit direct shell command execution targeting external remote targets or package publishing
    if (request.category === OperationCategory.COMMAND_EXECUTION) {
      const cmd = (request.target || request.action).toLowerCase();
      if (cmd.includes('npm publish') || cmd.includes('git push') || cmd.includes('rm -rf /')) {
        return {
          allowed: false,
          requiresHumanApproval: true,
          reason: `External publishing or destructive deletion command '${cmd}' requires human approval.`,
        };
      }
      return {
        allowed: true,
        requiresHumanApproval: false,
        reason: 'Command is permitted within standard development execution bounds.',
      };
    }

    // 3. File modifications are permitted if they do not target sensitive secrets
    if (request.category === OperationCategory.FILE_MODIFICATION) {
      const target = (request.target || '').toLowerCase();
      if (target.includes('.env') || target.includes('credentials') || target.includes('secret')) {
        return {
          allowed: false,
          requiresHumanApproval: true,
          reason: `Modification of sensitive environment or secret file '${request.target}' requires human approval.`,
        };
      }
      return {
        allowed: true,
        requiresHumanApproval: false,
        reason: 'Standard workspace file modification is permitted.',
      };
    }

    // 4. Read-only and test execution are allowed by default
    return {
      allowed: true,
      requiresHumanApproval: false,
      reason: 'Read-only or automated test operation is permitted by policy.',
    };
  }
}
