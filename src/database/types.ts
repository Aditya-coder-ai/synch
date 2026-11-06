/**
 * Database type declarations and Prisma model contracts for CrewFlow Phase 2.
 */

export const WorkspaceRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const ProjectStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const TaskStatus = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const AgentRole = {
  COORDINATOR: 'COORDINATOR',
  DEVELOPER: 'DEVELOPER',
  QA: 'QA',
  REVIEWER: 'REVIEWER',
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

export const AgentStatus = {
  ACTIVE: 'ACTIVE',
  IDLE: 'IDLE',
  BUSY: 'BUSY',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR',
  OFFLINE: 'OFFLINE',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const MessageSenderType = {
  HUMAN: 'HUMAN',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
} as const;
export type MessageSenderType = (typeof MessageSenderType)[keyof typeof MessageSenderType];

export const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ExecutionStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
} as const;
export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const OrchestrationStatus = {
  CREATED: 'CREATED',
  PLANNING: 'PLANNING',
  PLAN_READY: 'PLAN_READY',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrchestrationStatus = (typeof OrchestrationStatus)[keyof typeof OrchestrationStatus];

export const RiskLevel = {
  L0: 'L0',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  L4: 'L4',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const ActionCategory = {
  FILE_READ: 'FILE_READ',
  FILE_CREATE: 'FILE_CREATE',
  FILE_MODIFY: 'FILE_MODIFY',
  FILE_DELETE: 'FILE_DELETE',
  COMMAND_EXECUTE: 'COMMAND_EXECUTE',
  TEST_EXECUTE: 'TEST_EXECUTE',
  DATABASE_READ: 'DATABASE_READ',
  DATABASE_WRITE: 'DATABASE_WRITE',
  DATABASE_MIGRATION: 'DATABASE_MIGRATION',
  ENVIRONMENT_MODIFY: 'ENVIRONMENT_MODIFY',
  NETWORK_ACCESS: 'NETWORK_ACCESS',
  GIT_COMMIT: 'GIT_COMMIT',
  GIT_PUSH: 'GIT_PUSH',
  DEPLOYMENT: 'DEPLOYMENT',
  EXTERNAL_SERVICE_ACTION: 'EXTERNAL_SERVICE_ACTION',
} as const;
export type ActionCategory = (typeof ActionCategory)[keyof typeof ActionCategory];

export const AuditOutcome = {
  ALLOWED: 'ALLOWED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  DENIED: 'DENIED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  BLOCKED: 'BLOCKED',
} as const;
export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

export const MemoryCategory = {
  PROJECT_CONTEXT: 'PROJECT_CONTEXT',
  USER_PREFERENCE: 'USER_PREFERENCE',
  DECISION: 'DECISION',
  TECHNICAL_KNOWLEDGE: 'TECHNICAL_KNOWLEDGE',
  TASK_CONTEXT: 'TASK_CONTEXT',
  LESSON_LEARNED: 'LESSON_LEARNED',
} as const;
export type MemoryCategory = (typeof MemoryCategory)[keyof typeof MemoryCategory];

// Database model representation interfaces
export interface UserModel {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceModel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberModel {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface ProjectModel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface TaskModel {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedUserId: string | null;
  assignedAgentId: string | null;
  orchestrationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
}

export interface TaskDependencyModel {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: Date;
}

export interface AgentModel {
  id: string;
  projectId: string;
  name: string;
  role: AgentRole;
  description: string | null;
  status: AgentStatus;
  capabilities: unknown;
  configuration: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationModel {
  id: string;
  projectId: string;
  title: string;
  externalRoomId: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageModel {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderId: string | null;
  content: string;
  metadata: unknown;
  createdAt: Date;
}

export interface DecisionModel {
  id: string;
  projectId: string;
  taskId: string | null;
  title: string;
  description: string;
  rationale: string;
  decidedByUserId: string | null;
  decidedByAgentId: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface ApprovalModel {
  id: string;
  projectId: string;
  taskId: string | null;
  executionId: string | null;
  requestedByAgentId: string | null;
  actionType: string;
  actionCategory: string;
  riskLevel: string;
  actionDigest: string | null;
  description: string;
  status: ApprovalStatus;
  payload: unknown;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  decisionReason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionModel {
  id: string;
  projectId: string;
  taskId: string;
  agentId: string;
  status: ExecutionStatus;
  input: unknown;
  output: unknown | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionEventModel {
  id: string;
  executionId: string;
  eventType: string;
  message: string;
  payload: unknown;
  createdAt: Date;
}

export interface MemoryEntryModel {
  id: string;
  projectId: string;
  taskId: string | null;
  category: MemoryCategory;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrchestrationModel {
  id: string;
  projectId: string;
  initiatorUserId: string | null;
  conversationId: string | null;
  status: OrchestrationStatus;
  objective: string;
  context: unknown;
  plan: unknown | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrchestrationEventModel {
  id: string;
  orchestrationId: string;
  eventType: string;
  message: string;
  payload: unknown;
  createdAt: Date;
}

export interface AuditLogModel {
  id: string;
  actorId: string | null;
  actorType: string;
  workspaceId: string | null;
  projectId: string | null;
  actionCategory: string;
  actionType: string;
  riskLevel: string;
  outcome: string;
  reason: string | null;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

