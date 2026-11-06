import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../../src/modules/security/audit/audit.service.js';
import { AuditRepository } from '../../src/modules/security/audit/audit.repository.js';
import { ActionCategory, AuditOutcome, RiskLevel } from '../../src/modules/security/security.types.js';

describe('Phase 7: Security Audit Logging & Secret Redaction Tests', () => {
  let mockPrisma: any;
  let auditService: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      auditLog: {
        create: vi.fn().mockImplementation(({ data }) => ({
          id: 'audit-log-123',
          ...data,
          createdAt: new Date(),
        })),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    auditService = new AuditService({
      prismaClient: mockPrisma,
      repository: new AuditRepository(mockPrisma),
    });
  });

  it('records an audit entry with structured actor, category, and outcome metadata', async () => {
    const entry = await auditService.log({
      actorId: 'agent-dev-1',
      actorType: 'AGENT',
      projectId: 'proj-100',
      actionCategory: ActionCategory.COMMAND_EXECUTE,
      actionType: 'run_build',
      riskLevel: RiskLevel.L1,
      outcome: AuditOutcome.ALLOWED,
      reason: 'Build command passed security policy checks',
      metadata: { command: 'npm run build' },
    });

    expect(entry.id).toBe('audit-log-123');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'agent-dev-1',
          actorType: 'AGENT',
          projectId: 'proj-100',
          actionCategory: ActionCategory.COMMAND_EXECUTE,
          outcome: AuditOutcome.ALLOWED,
        }),
      }),
    );
  });

  it('automatically sanitizes secrets and sensitive keys from audit metadata', async () => {
    await auditService.log({
      actorId: 'user-001',
      actorType: 'HUMAN',
      projectId: 'proj-100',
      actionCategory: ActionCategory.ENVIRONMENT_MODIFY,
      actionType: 'set_env',
      outcome: AuditOutcome.APPROVED,
      metadata: {
        normalKey: 'visible-value',
        password: 'my-super-secret-password',
        api_token: 'secret-token-value',
        rawOutput: 'Connecting with key sk-1234567890abcdef12345678 and Bearer token1234567890',
      },
    });

    const createCall = mockPrisma.auditLog.create.mock.calls[0][0];
    const savedMetadata = createCall.data.metadata;

    expect(savedMetadata.normalKey).toBe('visible-value');
    expect(savedMetadata.password).toBe('[REDACTED]');
    expect(savedMetadata.api_token).toBe('[REDACTED]');
    expect(savedMetadata.rawOutput).not.toContain('sk-1234567890abcdef12345678');
    expect(savedMetadata.rawOutput).toContain('[REDACTED_SECRET]');
  });

  it('supports querying audit logs with project and outcome filters', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { id: 'a1', outcome: 'DENIED' },
      { id: 'a2', outcome: 'DENIED' },
    ]);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const result = await auditService.queryLogs({
      projectId: 'proj-100',
      outcome: 'DENIED',
      limit: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        projectId: 'proj-100',
        outcome: 'DENIED',
      }),
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 0,
    });
  });
});
