import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { ApprovalStatus } from '../../src/modules/security/security.types.js';

describe('Phase 7: Security & Approvals API Routes', () => {
  let app: any;
  let mockPrisma: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-admin',
          email: 'admin@crewflow.ai',
          name: 'System Admin',
        }),
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
      approval: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'appr-1',
            projectId: 'proj-001',
            actionType: 'deploy',
            actionCategory: 'DEPLOYMENT',
            riskLevel: 'L4',
            status: ApprovalStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue({
          id: 'appr-1',
          projectId: 'proj-001',
          actionType: 'deploy',
          actionCategory: 'DEPLOYMENT',
          riskLevel: 'L4',
          status: ApprovalStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({
          id: 'appr-1',
          projectId: 'proj-001',
          actionType: 'deploy',
          status: ApprovalStatus.APPROVED,
          reviewedByUserId: 'user-admin',
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1', createdAt: new Date() }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'audit-1',
            actionCategory: 'DEPLOYMENT',
            outcome: 'APPROVED',
            createdAt: new Date(),
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      conversation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(cb => cb(mockPrisma)),
    };

    app = await buildApp({
      securityModuleOptions: {
        prismaClient: mockPrisma,
      },
      logger: false,
    });
  });

  it('GET /api/v1/approvals returns list of approvals with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/approvals?projectId=proj-001&status=PENDING',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('GET /api/v1/approvals/:id returns approval details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/approvals/appr-1',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('appr-1');
  });

  it('POST /api/v1/approvals/:id/approve requires authenticated user', async () => {
    // Missing x-user-id or auth header
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approvals/appr-1/approve',
      payload: { decisionReason: 'Looks good' },
    });

    expect(res.statusCode).toBe(401);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/approvals/:id/approve succeeds with authenticated human reviewer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approvals/appr-1/approve',
      headers: {
        'x-user-id': 'user-admin',
      },
      payload: { decisionReason: 'Production release approved after QA verification' },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe(ApprovalStatus.APPROVED);
  });

  it('POST /api/v1/approvals/:id/reject rejects pending approval', async () => {
    mockPrisma.approval.update.mockResolvedValue({
      id: 'appr-1',
      projectId: 'proj-001',
      actionType: 'deploy',
      status: ApprovalStatus.REJECTED,
      reviewedByUserId: 'user-admin',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/approvals/appr-1/reject',
      headers: {
        'x-user-id': 'user-admin',
      },
      payload: { decisionReason: 'Rejection reason' },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe(ApprovalStatus.REJECTED);
  });

  it('GET /api/v1/security/audit returns queryable audit logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/security/audit?outcome=APPROVED',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].actionCategory).toBe('DEPLOYMENT');
  });
});

