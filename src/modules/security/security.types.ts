import { ActionCategory, RiskLevel, ApprovalStatus, AuditOutcome } from '../../database/types.js';

export { ActionCategory, RiskLevel, ApprovalStatus, AuditOutcome };

export const PermissionDecision = {
  ALLOWED: 'ALLOWED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  DENIED: 'DENIED',
} as const;

export type PermissionDecision = (typeof PermissionDecision)[keyof typeof PermissionDecision];

export interface ActionPayload {
  category: ActionCategory;
  type: string;
  target?: string;
  payload?: Record<string, unknown>;
  command?: string;
}

export interface UserContext {
  id: string;
  email?: string;
  name?: string;
  workspaceRole?: string;
}

export interface AgentContext {
  id: string;
  role: string;
  name?: string;
}

export interface ProjectContext {
  id: string;
  workspaceId?: string;
  name?: string;
}

export interface ExecutionContext {
  id: string;
  taskId?: string;
}

export interface ActionEvaluationContext {
  user?: UserContext;
  agent?: AgentContext;
  project: ProjectContext;
  execution?: ExecutionContext;
  action: ActionPayload;
}

export interface EvaluationResult {
  decision: PermissionDecision;
  policyId: string;
  riskLevel: RiskLevel;
  reason: string;
  requiresApproval: boolean;
  requiredRole?: string;
  actionDigest: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRequestInput {
  projectId: string;
  taskId?: string | null;
  executionId?: string | null;
  requestedByAgentId?: string | null;
  actionCategory: ActionCategory;
  actionType: string;
  description: string;
  riskLevel?: RiskLevel;
  payload?: Record<string, unknown>;
  actionDigest?: string;
  expiresInSeconds?: number;
}

export interface ApprovalDecisionInput {
  approvalId: string;
  reviewerUserId: string;
  decisionReason?: string;
}
