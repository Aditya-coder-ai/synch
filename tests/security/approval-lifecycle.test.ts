import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '../../src/modules/security/approvals/approval.service.js';
import { ApprovalRepository } from '../../src/modules/security/approvals/approval.repository.js';
import { ActionCategory, ApprovalStatus, RiskLevel } from '../../src/modules/security/security.types.js';
import {
  ApprovalAlreadyResolvedError,
  ApprovalExpiredError,
  SelfApprovalProhibitedError,
  UnauthorizedReviewerError,
} from '../../src/modules/security/security.errors.js';

describe('Phase 7: Approval Lifecycle & Authorization Tests', () => {
  let mockPrisma: any;
  let service: ApprovalService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      approval: {
        create: vi.fn().mockImplementation(({ data }) => ({
          id: 'appr-001',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'proj-001',
          workspaceId: 'ws-001',
          workspace: {
            members: [{ role: 'ADMIN' }],
          },
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-001', createdAt: new Date() }),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(cb => cb(mockPrisma)),
    };

    service = new ApprovalService({
      prismaClient: mockPrisma,
      repository: new ApprovalRepository(mockPrisma),
    });
  });

  it('creates an approval request with cryptographic digest and expiration timestamp', async () => {
    const approval = await service.requestApproval({
      projectId: 'proj-001',
      taskId: 'task-100',
      executionId: 'exec-500',
      requestedByAgentId: 'agent-dev',
      actionCategory: ActionCategory.DEPLOYMENT,
      actionType: 'deploy_to_production',
      description: 'Deploy release v1.2.0 to production cluster',
      riskLevel: RiskLevel.L4,
      payload: { releaseTag: 'v1.2.0' },
      expiresInSeconds: 3600,
    });

    expect(approval.id).toBe('appr-001');
    expect(approval.status).toBe(ApprovalStatus.PENDING);
    expect(approval.actionDigest).toHaveLength(64);
    expect(approval.expiresAt).toBeDefined();
    expect(mockPrisma.approval.create).toHaveBeenCalled();
  });

  it('authorizes and transitions a pending approval to APPROVED status', async () => {
    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      actionType: 'deploy_to_production',
      actionCategory: 'DEPLOYMENT',
      riskLevel: 'L4',
      status: ApprovalStatus.PENDING,
      expiresAt: new Date(Date.now() + 100000),
    });

    mockPrisma.approval.update.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      actionType: 'deploy_to_production',
      actionCategory: 'DEPLOYMENT',
      riskLevel: 'L4',
      status: ApprovalStatus.APPROVED,
      reviewedByUserId: 'user-admin',
      decisionReason: 'Reviewed and verified release notes',
      reviewedAt: new Date(),
    });

    const result = await service.approve('appr-001', 'user-admin', 'Reviewed and verified release notes');

    expect(result.status).toBe(ApprovalStatus.APPROVED);
    expect(result.reviewedByUserId).toBe('user-admin');
    expect(mockPrisma.approval.update).toHaveBeenCalled();
  });

  it('rejects an approval when requested by an authorized human reviewer', async () => {
    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      actionType: 'deploy_to_production',
      actionCategory: 'DEPLOYMENT',
      riskLevel: 'L4',
      status: ApprovalStatus.PENDING,
      expiresAt: new Date(Date.now() + 100000),
    });

    mockPrisma.approval.update.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      actionType: 'deploy_to_production',
      actionCategory: 'DEPLOYMENT',
      riskLevel: 'L4',
      status: ApprovalStatus.REJECTED,
      reviewedByUserId: 'user-admin',
      decisionReason: 'Failed staging tests',
      reviewedAt: new Date(),
    });

    const result = await service.reject('appr-001', 'user-admin', 'Failed staging tests');

    expect(result.status).toBe(ApprovalStatus.REJECTED);
    expect(mockPrisma.approval.update).toHaveBeenCalled();
  });

  it('prevents modifying an approval that has already been resolved', async () => {
    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      status: ApprovalStatus.APPROVED, // Already approved
    });

    await expect(service.approve('appr-001', 'user-admin')).rejects.toThrow(ApprovalAlreadyResolvedError);
  });

  it('rejects approval when the request has expired', async () => {
    const pastDate = new Date(Date.now() - 5000); // 5 seconds in the past
    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      status: ApprovalStatus.PENDING,
      expiresAt: pastDate,
    });

    await expect(service.approve('appr-001', 'user-admin')).rejects.toThrow(ApprovalExpiredError);
  });

  it('enforces separation of duties prohibiting self-approval', () => {
    expect(() => {
      service['authorizationService'].assertSeparationOfDuties({
        reviewerUserId: 'user-123',
        requesterUserId: 'user-123', // Same user attempting self-approval
        actionType: 'deploy',
      });
    }).toThrow(SelfApprovalProhibitedError);
  });

  it('rejects approval attempt when reviewer is not a workspace member', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'proj-001',
      workspaceId: 'ws-001',
      workspace: {
        members: [], // No membership for this user
      },
    });

    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-001',
      projectId: 'proj-001',
      status: ApprovalStatus.PENDING,
      expiresAt: new Date(Date.now() + 50000),
    });

    await expect(service.approve('appr-001', 'unauthorized-user')).rejects.toThrow(UnauthorizedReviewerError);
  });
});
