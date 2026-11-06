import { describe, it, expect } from 'vitest';
import { PermissionEvaluator } from '../../src/modules/security/permissions/permission.evaluator.js';
import {
  ActionCategory,
  RiskLevel,
  PermissionDecision,
} from '../../src/modules/security/security.types.js';

describe('Phase 7: Permission Engine & Security Policy Tests', () => {
  const evaluator = new PermissionEvaluator();

  it('permits read-only workspace operations at L0 without approval', () => {
    const result = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.FILE_READ,
        type: 'read_file',
        target: 'src/index.ts',
      },
    });

    expect(result.decision).toBe(PermissionDecision.ALLOWED);
    expect(result.riskLevel).toBe(RiskLevel.L0);
    expect(result.requiresApproval).toBe(false);
  });

  it('permits standard safe file modification at L1 without approval', () => {
    const result = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.FILE_MODIFY,
        type: 'edit_file',
        target: 'src/utils/helpers.ts',
      },
    });

    expect(result.decision).toBe(PermissionDecision.ALLOWED);
    expect(result.riskLevel).toBe(RiskLevel.L1);
    expect(result.requiresApproval).toBe(false);
  });

  it('strictly denies path traversal attempts with L4 risk', () => {
    const result = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.FILE_READ,
        type: 'read_file',
        target: '../../etc/passwd',
      },
    });

    expect(result.decision).toBe(PermissionDecision.DENIED);
    expect(result.riskLevel).toBe(RiskLevel.L4);
    expect(result.reason).toContain('Path traversal');
  });

  it('requires human approval for sensitive .env or secret file modifications at L4', () => {
    const result = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.FILE_MODIFY,
        type: 'modify_env',
        target: '.env.production',
      },
    });

    expect(result.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(result.riskLevel).toBe(RiskLevel.L4);
    expect(result.requiresApproval).toBe(true);
    expect(result.requiredRole).toBe('OWNER');
  });

  it('requires human approval for destructive shell commands at L4', () => {
    const result = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.COMMAND_EXECUTE,
        type: 'run_script',
        command: 'rm -rf /var/data',
      },
    });

    expect(result.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(result.riskLevel).toBe(RiskLevel.L4);
    expect(result.requiresApproval).toBe(true);
    expect(result.requiredRole).toBe('ADMIN');
  });

  it('requires human approval for database migrations at L3 or L4', () => {
    const standardMigration = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.DATABASE_MIGRATION,
        type: 'prisma_migrate',
        command: 'prisma migrate deploy',
      },
    });

    expect(standardMigration.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(standardMigration.riskLevel).toBe(RiskLevel.L3);

    const destructiveMigration = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.DATABASE_MIGRATION,
        type: 'raw_sql_migration',
        command: 'DROP TABLE users CASCADE',
      },
    });

    expect(destructiveMigration.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(destructiveMigration.riskLevel).toBe(RiskLevel.L4);
    expect(destructiveMigration.requiredRole).toBe('OWNER');
  });

  it('requires human approval for production deployments and package publishing at L4', () => {
    const deployment = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.DEPLOYMENT,
        type: 'deploy_service',
        command: 'npm publish --access public',
      },
    });

    expect(deployment.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(deployment.riskLevel).toBe(RiskLevel.L4);
    expect(deployment.requiresApproval).toBe(true);
  });

  it('requires human approval for remote git push operations at L3', () => {
    const gitPush = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.GIT_PUSH,
        type: 'git_push',
        command: 'git push origin main',
      },
    });

    expect(gitPush.decision).toBe(PermissionDecision.APPROVAL_REQUIRED);
    expect(gitPush.riskLevel).toBe(RiskLevel.L3);
    expect(gitPush.requiresApproval).toBe(true);
  });

  it('permits local git commits without approval at L1', () => {
    const gitCommit = evaluator.evaluateAction({
      project: { id: 'proj-123' },
      action: {
        category: ActionCategory.GIT_COMMIT,
        type: 'git_commit',
        command: 'git commit -m "feat: safe commit"',
      },
    });

    expect(gitCommit.decision).toBe(PermissionDecision.ALLOWED);
    expect(gitCommit.riskLevel).toBe(RiskLevel.L1);
  });
});
