import type { ActionCategory, RiskLevel, AuditOutcome } from '../security.types.js';

export interface AuditLogEntryInput {
  actorId?: string | null;
  actorType?: 'HUMAN' | 'AGENT' | 'SYSTEM';
  workspaceId?: string | null;
  projectId?: string | null;
  actionCategory: ActionCategory | string;
  actionType: string;
  riskLevel?: RiskLevel | string;
  outcome: AuditOutcome | string;
  reason?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogQueryFilters {
  projectId?: string;
  workspaceId?: string;
  actorId?: string;
  actorType?: string;
  actionCategory?: string;
  outcome?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

