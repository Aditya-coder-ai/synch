import path from 'node:path';
import { WorkspaceSecurityError } from '../opencode/opencode.errors.js';
import type { WorkspacePathValidation } from './workspace.types.js';

export class WorkspaceSecurity {
  /**
   * Validates and safely resolves a path relative to an approved workspace root.
   * Throws WorkspaceSecurityError if the path attempts traversal outside the root.
   */
  public static validatePath(workspaceRoot: string, targetPath: string): WorkspacePathValidation {
    if (!targetPath || typeof targetPath !== 'string') {
      return {
        valid: false,
        normalizedPath: '',
        error: 'Target path must be a non-empty string',
      };
    }

    // Check for null byte injection
    if (targetPath.includes('\0')) {
      return {
        valid: false,
        normalizedPath: '',
        error: 'Path contains prohibited null byte sequence',
      };
    }

    const resolvedRoot = path.resolve(workspaceRoot);
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(resolvedRoot, targetPath);

    // Ensure the target path starts with the resolved root followed by path separator or end
    const relative = path.relative(resolvedRoot, resolvedTarget);
    const isInside = !relative.startsWith('..') && !path.isAbsolute(relative);

    if (!isInside) {
      return {
        valid: false,
        normalizedPath: resolvedTarget,
        error: `Path traversal detected: '${targetPath}' resolves outside approved workspace root '${resolvedRoot}'`,
      };
    }

    return {
      valid: true,
      normalizedPath: resolvedTarget,
    };
  }

  /**
   * Asserts path containment or throws WorkspaceSecurityError.
   */
  public static assertSafePath(workspaceRoot: string, targetPath: string): string {
    const result = this.validatePath(workspaceRoot, targetPath);
    if (!result.valid) {
      throw new WorkspaceSecurityError(result.error || 'Prohibited workspace path traversal', {
        workspaceRoot,
        targetPath,
      });
    }
    return result.normalizedPath;
  }

  /**
   * Checks whether a path targets sensitive or protected system files.
   */
  public static isSensitiveFile(filePath: string): boolean {
    const base = path.basename(filePath).toLowerCase();
    return (
      base === '.env' ||
      base.startsWith('.env.') ||
      base === 'id_rsa' ||
      base.endsWith('.pem') ||
      base.endsWith('.key') ||
      base === 'credentials.json' ||
      base === 'secret.yaml' ||
      base === 'secret.json'
    );
  }
}
