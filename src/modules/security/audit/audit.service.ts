import type { PrismaClient } from '@prisma/client';
import { AuditOutcome } from '../security.types.js';
import { AuditRepository } from './audit.repository.js';
import type { AuditLogEntryInput, AuditLogQueryFilters } from './audit.types.js';

export interface AuditServiceOptions {
  prismaClient?: PrismaClient;
  repository?: AuditRepository;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /private[_-]?key/i,
  /bearer/i,
];

const SECRET_VALUE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs,
];

export class AuditService {
  private readonly repository: AuditRepository;

  constructor(options: AuditServiceOptions = {}) {
    this.repository = options.repository ?? new AuditRepository(options.prismaClient);
  }

  /**
   * Recursively scrubs sensitive credentials, keys, and tokens from audit metadata.
   */
  public sanitizeMetadata(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      let sanitized = data;
      for (const pattern of SECRET_VALUE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
      }
      return sanitized;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeMetadata(item));
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
        const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some(pat => pat.test(key));
        if (isSensitiveKey) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = this.sanitizeMetadata(val);
        }
      }
      return result;
    }

    return data;
  }

  /**
   * Appends an audit event with automatic secret scrubbing.
   */
  async log(entry: AuditLogEntryInput): Promise<{ id: string; createdAt: Date }> {
    const sanitizedEntry: AuditLogEntryInput = {
      ...entry,
      metadata: (this.sanitizeMetadata(entry.metadata || {}) as Record<string, unknown>) || {},
    };

    return this.repository.append(sanitizedEntry);
  }

  async logPermissionEvaluation(entry: {
    actorId?: string;
    actorType?: 'HUMAN' | 'AGENT' | 'SYSTEM';
    projectId?: string;
    actionCategory: string;
    actionType: string;
    riskLevel: string;
    outcome: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      ...entry,
      outcome: entry.outcome,
    });
  }

  async logApprovalRequest(entry: {
    approvalId: string;
    projectId: string;
    agentId?: string | null;
    actionCategory: string;
    actionType: string;
    riskLevel: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      actorId: entry.agentId ?? undefined,
      actorType: 'AGENT',
      projectId: entry.projectId,
      actionCategory: entry.actionCategory,
      actionType: entry.actionType,
      riskLevel: entry.riskLevel,
      outcome: AuditOutcome.APPROVAL_REQUIRED,
      reason: entry.reason,
      resourceId: entry.approvalId,
      metadata: entry.metadata,
    });
  }

  async logApprovalDecision(entry: {
    approvalId: string;
    projectId: string;
    reviewerUserId: string;
    decision: 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason?: string;
    actionCategory: string;
    actionType: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      actorId: entry.reviewerUserId,
      actorType: 'HUMAN',
      projectId: entry.projectId,
      actionCategory: entry.actionCategory,
      actionType: entry.actionType,
      outcome: entry.decision,
      reason: entry.reason,
      resourceId: entry.approvalId,
      metadata: entry.metadata,
    });
  }

  async logBlockedOperation(entry: {
    projectId: string;
    actorId?: string;
    actionCategory: string;
    actionType: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      actorId: entry.actorId,
      actorType: 'AGENT',
      projectId: entry.projectId,
      actionCategory: entry.actionCategory,
      actionType: entry.actionType,
      outcome: AuditOutcome.BLOCKED,
      reason: entry.reason,
      metadata: entry.metadata,
    });
  }

  async queryLogs(filters: AuditLogQueryFilters = {}) {
    return this.repository.findMany(filters);
  }
}

