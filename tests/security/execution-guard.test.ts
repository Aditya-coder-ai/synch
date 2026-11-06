import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionGuard } from '../../src/modules/security/guards/execution.guard.js';
import { ActionCategory, RiskLevel, ApprovalStatus } from '../../src/modules/security/security.types.js';
import {
  PermissionDeniedError,
  ApprovalDigestMismatchError,
  ApprovalExpiredError,
} from '../../src/modules/security/security.errors.js';
import { computeActionDigest } from '../../src/modules/security/approvals/approval.digest.js';

describe('Phase 7: ExecutionGuard Pre-Execution Verification Tests', () => {
  let mockPrisma: any;
  let guard: ExecutionGuard;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      approval: {
        create: vi.fn().mockImplementation(({ data }) => ({
          id: 'appr-req-999',
          ...data,
          status: ApprovalStatus.PENDING,
          createdAt: new Date(),
        })),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    guard = new ExecutionGuard({ prismaClient: mockPrisma });
  });

  it('authorizes safe read-only actions immediately without requiring approval', async () => {
    const result = await guard.assertAuthorized({
      projectId: 'proj-1',
      executionId: 'exec-1',
      action: {
        category: ActionCategory.FILE_READ,
        type: 'read_source',
        target: 'src/main.ts',
      },
    });

    expect(result.authorized).toBe(true);
    expect(mockPrisma.approval.create).not.toHaveBeenCalled();
  });

  it('creates an approval request and throws PermissionDeniedError for unapproved sensitive actions', async () => {
    mockPrisma.approval.findFirst.mockResolvedValue(null);

    await expect(
      guard.assertAuthorized({
        projectId: 'proj-1',
        executionId: 'exec-1',
        agentId: 'agent-dev',
        action: {
          category: ActionCategory.DEPLOYMENT,
          type: 'production_deploy',
          command: 'npm publish',
        },
      }),
    ).rejects.toThrow(PermissionDeniedError);

    expect(mockPrisma.approval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: 'proj-1',
        executionId: 'exec-1',
        actionCategory: ActionCategory.DEPLOYMENT,
        status: ApprovalStatus.PENDING,
      }),
    });
  });

  it('authorizes execution when a matching, non-expired approval is verified', async () => {
    const action = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'run_destructive_task',
      command: 'rm -rf /var/data',
    };

    const actionDigest = computeActionDigest(action);

    mockPrisma.approval.findFirst.mockResolvedValue({
      id: 'appr-existing-1',
      executionId: 'exec-1',
      actionDigest,
      status: ApprovalStatus.APPROVED,
      riskLevel: RiskLevel.L4,
      expiresAt: new Date(Date.now() + 60000), // Valid for 1 more minute
    });

    const result = await guard.assertAuthorized({
      projectId: 'proj-1',
      executionId: 'exec-1',
      action,
    });

    expect(result.authorized).toBe(true);
    expect(result.approvalId).toBe('appr-existing-1');
  });

  it('rejects execution when the action payload digest has been tampered with', async () => {
    const action = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'run_destructive_task',
      command: 'rm -rf /var/data',
    };

    mockPrisma.approval.findFirst.mockResolvedValue({
      id: 'appr-existing-1',
      executionId: 'exec-1',
      actionDigest: 'mismatched-tampered-sha256-digest-value',
      status: ApprovalStatus.APPROVED,
      riskLevel: RiskLevel.L4,
      expiresAt: new Date(Date.now() + 60000),
    });

    await expect(
      guard.assertAuthorized({
        projectId: 'proj-1',
        executionId: 'exec-1',
        action,
      }),
    ).rejects.toThrow(ApprovalDigestMismatchError);
  });

  it('rejects execution when an approved record has expired', async () => {
    const action = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'run_destructive_task',
      command: 'rm -rf /var/data',
    };

    const actionDigest = computeActionDigest(action);

    mockPrisma.approval.findFirst.mockResolvedValue({
      id: 'appr-existing-1',
      executionId: 'exec-1',
      actionDigest,
      status: ApprovalStatus.APPROVED,
      riskLevel: RiskLevel.L4,
      expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
    });

    await expect(
      guard.assertAuthorized({
        projectId: 'proj-1',
        executionId: 'exec-1',
        action,
      }),
    ).rejects.toThrow(ApprovalExpiredError);
  });
});
