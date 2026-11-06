import type { ApprovalModel, ApprovalStatus } from '../../../database/types.js';

export type { ApprovalModel, ApprovalStatus };

export interface ApprovalFilters {
  projectId?: string;
  status?: ApprovalStatus;
  taskId?: string;
  executionId?: string;
  actionCategory?: string;
  riskLevel?: string;
  limit?: number;
  offset?: number;
}

export interface CreateApprovalRecordInput {
  projectId: string;
  taskId?: string | null;
  executionId?: string | null;
  requestedByAgentId?: string | null;
  actionType: string;
  actionCategory: string;
  riskLevel: string;
  actionDigest: string;
  description: string;
  payload?: Record<string, unknown>;
  expiresAt?: Date | null;
}
