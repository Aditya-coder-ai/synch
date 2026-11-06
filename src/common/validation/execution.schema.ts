import { z } from 'zod';
import { ExecutionStatus } from '../../database/types.js';

export const executionStatusSchema = z.enum([
  ExecutionStatus.QUEUED,
  ExecutionStatus.RUNNING,
  ExecutionStatus.SUCCEEDED,
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.AWAITING_APPROVAL,
]);

export const createExecutionSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  taskId: z.string().trim().min(1, 'Task ID is required'),
  agentId: z.string().trim().min(1, 'Agent ID is required'),
  input: z.record(z.unknown()).default({}),
});

export const updateExecutionSchema = z
  .object({
    status: executionStatusSchema.optional(),
    output: z.record(z.unknown()).optional().nullable(),
    error: z.string().trim().max(5000).optional().nullable(),
    startedAt: z.coerce.date().optional().nullable(),
    completedAt: z.coerce.date().optional().nullable(),
  })
  .strict();

export const createExecutionEventSchema = z.object({
  executionId: z.string().trim().min(1, 'Execution ID is required'),
  eventType: z.string().trim().min(1, 'Event type is required').max(100),
  message: z.string().trim().min(1, 'Message is required').max(1000),
  payload: z.record(z.unknown()).default({}),
});
