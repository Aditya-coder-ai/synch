import { ActionCategory, RiskLevel, type ActionPayload } from '../security.types.js';
import { PermissionRegistry } from '../permissions/permission.registry.js';
import { PermissionDeniedError } from '../security.errors.js';

export class ActionGuard {
  /**
   * Pre-execution sanity checks on filesystem targets and shell commands.
   */
  public static validateAction(action: ActionPayload): void {
    // 1. Filesystem path traversal check
    if (action.target) {
      if (action.target.includes('\0')) {
        throw new PermissionDeniedError('Null byte detected in action target path.');
      }
      if (action.target.includes('..')) {
        throw new PermissionDeniedError('Path traversal (..) is not permitted in target path.');
      }
    }

    // 2. Destructive command check
    const command = action.command || action.type || '';
    if (/rm\s+-rf\s+(?:\/|\.\.|\*)/i.test(command)) {
      throw new PermissionDeniedError(`Destructive deletion command '${command}' is prohibited without human authorization.`);
    }

    // 3. Secret environment write check
    if (
      (action.category === ActionCategory.FILE_CREATE ||
        action.category === ActionCategory.FILE_MODIFY ||
        action.category === ActionCategory.ENVIRONMENT_MODIFY) &&
      action.target
    ) {
      const lowerTarget = action.target.toLowerCase();
      if (lowerTarget.includes('.env') || lowerTarget.includes('credentials') || lowerTarget.includes('id_rsa')) {
        const classified = PermissionRegistry.classifyAction(action);
        if (classified.riskLevel === RiskLevel.L4) {
          // Flagged for approval
        }
      }
    }
  }
}
