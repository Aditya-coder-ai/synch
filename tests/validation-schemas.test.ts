import { describe, it, expect } from 'vitest';
import {
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
} from '../src/common/validation/workspace.schema.js';
import { createProjectSchema, updateProjectSchema } from '../src/common/validation/project.schema.js';
import {
  createTaskSchema,
  updateTaskSchema,
  createTaskDependencySchema,
} from '../src/common/validation/task.schema.js';
import { createAgentSchema } from '../src/common/validation/agent.schema.js';
import { createMessageSchema } from '../src/common/validation/conversation.schema.js';
import {
  createApprovalSchema,
  reviewApprovalSchema,
} from '../src/common/validation/approval.schema.js';
import { createMemoryEntrySchema } from '../src/common/validation/memory.schema.js';
import {
  WorkspaceRole,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  AgentRole,
  AgentStatus,
  MessageSenderType,
  ApprovalStatus,
  MemoryCategory,
} from '../src/database/types.js';

describe('Zod Validation Schemas (Phase 2 Models)', () => {
  describe('Workspace Schemas', () => {
    it('should validate valid workspace creation data', () => {
      const valid = createWorkspaceSchema.safeParse({
        name: 'Autonomous Operations',
        slug: 'auto-ops-workspace',
        description: 'Primary operations workspace for AI agents',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject invalid slug formats with uppercase or spaces', () => {
      const invalid = createWorkspaceSchema.safeParse({
        name: 'Workspace 1',
        slug: 'Invalid Slug With Spaces',
      });
      expect(invalid.success).toBe(false);
    });

    it('should validate workspace membership with default role MEMBER', () => {
      const parsed = addWorkspaceMemberSchema.parse({
        userId: 'usr_abc123',
      });
      expect(parsed.role).toBe(WorkspaceRole.MEMBER);
    });

    it('should reject invalid workspace roles', () => {
      const invalid = addWorkspaceMemberSchema.safeParse({
        userId: 'usr_abc123',
        role: 'SUPERADMIN',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Project Schemas', () => {
    it('should validate valid project with default status PLANNING', () => {
      const parsed = createProjectSchema.parse({
        workspaceId: 'ws_123',
        name: 'Core Agent Platform',
      });
      expect(parsed.status).toBe(ProjectStatus.PLANNING);
    });

    it('should accept all valid project statuses', () => {
      for (const status of Object.values(ProjectStatus)) {
        const result = updateProjectSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject unknown project statuses', () => {
      const result = updateProjectSchema.safeParse({ status: 'INVALID_STATUS' });
      expect(result.success).toBe(false);
    });
  });

  describe('Task & TaskDependency Schemas', () => {
    it('should validate task assigned to user only', () => {
      const result = createTaskSchema.safeParse({
        projectId: 'proj_1',
        title: 'Design API schemas',
        assignedUserId: 'user_1',
      });
      expect(result.success).toBe(true);
    });

    it('should validate task assigned to agent only', () => {
      const result = createTaskSchema.safeParse({
        projectId: 'proj_1',
        title: 'Generate unit tests',
        assignedAgentId: 'agent_1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject task assigned to both user and agent simultaneously', () => {
      const result = createTaskSchema.safeParse({
        projectId: 'proj_1',
        title: 'Conflicting task',
        assignedUserId: 'user_1',
        assignedAgentId: 'agent_1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'cannot be assigned to both a human user and an AI agent simultaneously',
        );
      }
    });

    it('should reject updateTaskSchema when updating with dual assignment', () => {
      const result = updateTaskSchema.safeParse({
        assignedUserId: 'user_1',
        assignedAgentId: 'agent_1',
      });
      expect(result.success).toBe(false);
    });

    it('should validate all valid task statuses and priorities', () => {
      for (const status of Object.values(TaskStatus)) {
        for (const priority of Object.values(TaskPriority)) {
          const res = createTaskSchema.safeParse({
            projectId: 'proj_1',
            title: 'Sample task',
            status,
            priority,
          });
          expect(res.success).toBe(true);
        }
      }
    });

    it('should reject task dependency where task depends on itself', () => {
      const result = createTaskDependencySchema.safeParse({
        taskId: 'task_same',
        dependsOnTaskId: 'task_same',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('cannot depend on itself');
      }
    });

    it('should accept valid distinct task dependency', () => {
      const result = createTaskDependencySchema.safeParse({
        taskId: 'task_child',
        dependsOnTaskId: 'task_parent',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Agent Schemas', () => {
    it('should validate agent with role and status', () => {
      const result = createAgentSchema.safeParse({
        projectId: 'proj_1',
        name: 'Coordinator Agent',
        role: AgentRole.COORDINATOR,
        status: AgentStatus.ACTIVE,
        capabilities: ['task_decomposition', 'workflow_scheduling'],
        configuration: { timeoutSeconds: 300 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject agent configuration containing secret credentials', () => {
      const result = createAgentSchema.safeParse({
        projectId: 'proj_1',
        name: 'Insecure Agent',
        configuration: {
          apiKey: 'sk-proj-super-secret-key-12345',
        },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Agent configuration cannot contain secret credentials or API keys',
        );
      }
    });
  });

  describe('Conversation & Message Schemas', () => {
    it('should validate messages with senderType HUMAN, AGENT, or SYSTEM', () => {
      for (const senderType of Object.values(MessageSenderType)) {
        const result = createMessageSchema.safeParse({
          conversationId: 'conv_1',
          senderType,
          senderId: 'id_123',
          content: 'Hello collaborative team',
          metadata: { room: 'dev-chat' },
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty message content', () => {
      const result = createMessageSchema.safeParse({
        conversationId: 'conv_1',
        senderType: MessageSenderType.HUMAN,
        content: '   ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Approval Schemas', () => {
    it('should accept valid approval request with default status PENDING', () => {
      const parsed = createApprovalSchema.parse({
        projectId: 'proj_1',
        actionType: 'DATABASE_MIGRATION',
        description: 'Deploy schema update to production',
        payload: { migrationName: 'init_phase2' },
      });
      expect(parsed.actionType).toBe('DATABASE_MIGRATION');
    });

    it('should validate approval review only allowing APPROVED or REJECTED', () => {
      const approved = reviewApprovalSchema.safeParse({
        status: ApprovalStatus.APPROVED,
        reviewedByUserId: 'usr_admin',
        reviewComment: 'Verified and approved',
      });
      expect(approved.success).toBe(true);

      const rejected = reviewApprovalSchema.safeParse({
        status: ApprovalStatus.REJECTED,
        reviewedByUserId: 'usr_admin',
      });
      expect(rejected.success).toBe(true);

      const invalid = reviewApprovalSchema.safeParse({
        status: ApprovalStatus.PENDING,
        reviewedByUserId: 'usr_admin',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Memory Entry Schemas', () => {
    it('should accept valid memory categories', () => {
      for (const category of Object.values(MemoryCategory)) {
        const result = createMemoryEntrySchema.safeParse({
          projectId: 'proj_1',
          category,
          title: 'Architecture note',
          content: 'Keep business logic decoupled from Prisma',
          sourceType: 'manual',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject unknown memory categories', () => {
      const result = createMemoryEntrySchema.safeParse({
        projectId: 'proj_1',
        category: 'RANDOM_CATEGORY',
        title: 'Invalid entry',
        content: 'Content here',
        sourceType: 'manual',
      });
      expect(result.success).toBe(false);
    });
  });
});

