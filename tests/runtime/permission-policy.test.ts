import { describe, it, expect } from 'vitest';
import {
  OperationCategory,
  PermissionPolicy,
} from '../../src/modules/runtime/permissions/permission.policy.js';

describe('Permission Policy & Least Privilege Enforcement', () => {
  it('should allow read-only operations without approval', () => {
    const evaluation = PermissionPolicy.evaluate({
      category: OperationCategory.READ_ONLY,
      action: 'read_file',
      target: 'src/app.ts',
    });

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.requiresHumanApproval).toBe(false);
  });

  it('should allow standard test execution without approval', () => {
    const evaluation = PermissionPolicy.evaluate({
      category: OperationCategory.TEST_EXECUTION,
      action: 'run_tests',
      target: 'npm test',
    });

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.requiresHumanApproval).toBe(false);
  });

  it('should allow standard file modification on non-sensitive files', () => {
    const evaluation = PermissionPolicy.evaluate({
      category: OperationCategory.FILE_MODIFICATION,
      action: 'write_file',
      target: 'src/services/user.service.ts',
    });

    expect(evaluation.allowed).toBe(true);
    expect(evaluation.requiresHumanApproval).toBe(false);
  });

  it('should require human approval when modifying sensitive .env or secret files', () => {
    const evaluation = PermissionPolicy.evaluate({
      category: OperationCategory.FILE_MODIFICATION,
      action: 'edit_file',
      target: '.env.production',
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.requiresHumanApproval).toBe(true);
    expect(evaluation.reason).toContain('requires human approval');
  });

  it('should require human approval for destructive operations and external publishing commands', () => {
    const evaluationPublish = PermissionPolicy.evaluate({
      category: OperationCategory.COMMAND_EXECUTION,
      action: 'shell_exec',
      target: 'npm publish --access public',
    });

    expect(evaluationPublish.allowed).toBe(false);
    expect(evaluationPublish.requiresHumanApproval).toBe(true);

    const evaluationDestructive = PermissionPolicy.evaluate({
      category: OperationCategory.DESTRUCTIVE_OPERATION,
      action: 'delete_directory',
      target: 'data/backups',
    });

    expect(evaluationDestructive.allowed).toBe(false);
    expect(evaluationDestructive.requiresHumanApproval).toBe(true);
  });
});
