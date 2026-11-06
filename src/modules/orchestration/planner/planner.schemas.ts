import { z } from 'zod';
import { AgentRole, TaskPriority } from '../../../database/types.js';

export const complexityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const plannedTaskSchema = z.object({
  tempId: z.string().trim().min(1, 'Temporary planning ID is required'),
  title: z.string().trim().min(3, 'Task title must be at least 3 characters').max(200),
  description: z.string().trim().min(5, 'Task description must be at least 5 characters').max(2000),
  expectedOutcome: z.string().trim().min(5, 'Expected outcome is required').max(1000),
  requiredCapabilities: z.array(z.string().trim().min(1)).min(1, 'At least one required capability is needed'),
  suggestedRole: z.enum([
    AgentRole.COORDINATOR,
    AgentRole.DEVELOPER,
    AgentRole.QA,
    AgentRole.REVIEWER,
  ]),
  priority: z.enum([
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.CRITICAL,
  ]).default(TaskPriority.MEDIUM),
  dependencies: z.array(z.string().trim().min(1)).default([]),
  estimatedComplexity: complexityLevelSchema.default('MEDIUM'),
  completionCriteria: z.array(z.string().trim().min(3)).min(1, 'At least one completion criterion is required'),
});

export const structuredExecutionPlanSchema = z.object({
  planId: z.string().trim().min(1),
  objective: z.string().trim().min(5),
  summary: z.string().trim().min(5),
  tasks: z.array(plannedTaskSchema).min(1, 'A plan must contain at least one task'),
  dependencyGraph: z.record(z.string(), z.array(z.string())),
  estimatedTotalComplexity: complexityLevelSchema.default('MEDIUM'),
  createdAt: z.string(),
});

export const orchestrationRequestSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  objective: z.string().trim().min(5, 'Objective must be at least 5 characters long').max(5000),
  initiatorUserId: z.string().trim().min(1).optional().nullable(),
  conversationId: z.string().trim().min(1).optional().nullable(),
  context: z.record(z.string(), z.unknown()).default({}),
  autoExecute: z.boolean().default(true),
});

export type PlannedTaskSchema = z.infer<typeof plannedTaskSchema>;
export type StructuredExecutionPlanSchema = z.infer<typeof structuredExecutionPlanSchema>;
export type OrchestrationRequestSchema = z.infer<typeof orchestrationRequestSchema>;
