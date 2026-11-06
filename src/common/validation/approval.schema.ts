import { z } from 'zod';
import { ApprovalStatus } from '../../database/types.js';

export const approvalStatusSchema = z.enum([
  ApprovalStatus.PENDING,
  ApprovalStatus.APPROVED,
  ApprovalStatus.REJECTED,
  ApprovalStatus.EXPIRED,
  ApprovalStatus.CANCELLED,
]);

export const createApprovalSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  taskId: z.string().trim().min(1).optional().nullable(),
  executionId: z.string().trim().min(1).optional().nullable(),
  requestedByAgentId: z.string().trim().min(1).optional().nullable(),
  actionType: z.string().trim().min(1, 'Action type is required').max(100),
  description: z.string().trim().min(1, 'Description is required').max(1000),
  payload: z.record(z.unknown()).default({}),
});

export const reviewApprovalSchema = z.object({
  status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]),
  reviewedByUserId: z.string().trim().min(1, 'Reviewer User ID is required'),
  reviewComment: z.string().trim().max(1000).optional(),
});

