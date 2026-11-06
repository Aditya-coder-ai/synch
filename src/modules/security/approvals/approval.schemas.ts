import { z } from 'zod';
import { ActionCategory, RiskLevel, ApprovalStatus } from '../../../database/types.js';

export const approvalStatusEnum = z.enum([
  ApprovalStatus.PENDING,
  ApprovalStatus.APPROVED,
  ApprovalStatus.REJECTED,
  ApprovalStatus.EXPIRED,
  ApprovalStatus.CANCELLED,
]);

export const actionCategoryEnum = z.enum([
  ActionCategory.FILE_READ,
  ActionCategory.FILE_CREATE,
  ActionCategory.FILE_MODIFY,
  ActionCategory.FILE_DELETE,
  ActionCategory.COMMAND_EXECUTE,
  ActionCategory.TEST_EXECUTE,
  ActionCategory.DATABASE_READ,
  ActionCategory.DATABASE_WRITE,
  ActionCategory.DATABASE_MIGRATION,
  ActionCategory.ENVIRONMENT_MODIFY,
  ActionCategory.NETWORK_ACCESS,
  ActionCategory.GIT_COMMIT,
  ActionCategory.GIT_PUSH,
  ActionCategory.DEPLOYMENT,
  ActionCategory.EXTERNAL_SERVICE_ACTION,
]);

export const riskLevelEnum = z.enum([
  RiskLevel.L0,
  RiskLevel.L1,
  RiskLevel.L2,
  RiskLevel.L3,
  RiskLevel.L4,
]);

export const approvalDecisionSchema = z.object({
  decisionReason: z.string().trim().max(1000).optional(),
});

export const approvalQueryFiltersSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  status: approvalStatusEnum.optional(),
  taskId: z.string().trim().min(1).optional(),
  executionId: z.string().trim().min(1).optional(),
  actionCategory: actionCategoryEnum.optional(),
  riskLevel: riskLevelEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const approvalIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Approval ID is required'),
});
