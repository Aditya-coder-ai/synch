import { z } from 'zod';
import { TaskStatus, TaskPriority } from '../../database/types.js';

export const taskStatusSchema = z.enum([
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
]);

export const taskPrioritySchema = z.enum([
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.CRITICAL,
]);

const taskAssignmentRefinement = (data: {
  assignedUserId?: string | null;
  assignedAgentId?: string | null;
}) => {
  if (data.assignedUserId && data.assignedAgentId) {
    return false;
  }
  return true;
};

export const createTaskSchema = z
  .object({
    projectId: z.string().trim().min(1, 'Project ID is required'),
    title: z.string().trim().min(1, 'Task title is required').max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    status: taskStatusSchema.default(TaskStatus.BACKLOG),
    priority: taskPrioritySchema.default(TaskPriority.MEDIUM),
    assignedUserId: z.string().trim().min(1).optional().nullable(),
    assignedAgentId: z.string().trim().min(1).optional().nullable(),
    dueAt: z.coerce.date().optional().nullable(),
  })
  .refine(taskAssignmentRefinement, {
    message: 'A task cannot be assigned to both a human user and an AI agent simultaneously',
    path: ['assignedUserId'],
  });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assignedUserId: z.string().trim().min(1).optional().nullable(),
    assignedAgentId: z.string().trim().min(1).optional().nullable(),
    dueAt: z.coerce.date().optional().nullable(),
    completedAt: z.coerce.date().optional().nullable(),
  })
  .refine(taskAssignmentRefinement, {
    message: 'A task cannot be assigned to both a human user and an AI agent simultaneously',
    path: ['assignedUserId'],
  });

export const createTaskDependencySchema = z
  .object({
    taskId: z.string().trim().min(1, 'Task ID is required'),
    dependsOnTaskId: z.string().trim().min(1, 'DependsOnTask ID is required'),
  })
  .refine(data => data.taskId !== data.dependsOnTaskId, {
    message: 'A task cannot depend on itself',
    path: ['dependsOnTaskId'],
  });
