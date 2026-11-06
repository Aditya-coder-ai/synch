import { describe, it, expect } from 'vitest';
import { PlannerService } from '../../src/modules/orchestration/planner/planner.service.js';
import { BaselinePlanningStrategy } from '../../src/modules/orchestration/planner/planning-strategy.js';
import { AmbiguousRequestError } from '../../src/modules/orchestration/core/orchestration.errors.js';
import {
  plannedTaskSchema,
  structuredExecutionPlanSchema,
} from '../../src/modules/orchestration/planner/planner.schemas.js';
import { AgentRole, TaskPriority } from '../../src/database/types.js';

describe('Planner Module', () => {
  const strategy = new BaselinePlanningStrategy();
  const planner = new PlannerService(strategy);

  describe('Ambiguity Detection', () => {
    it('should reject requests with empty or whitespace-only objective', async () => {
      await expect(
        planner.plan({
          projectId: 'proj_123',
          objective: '   ',
        }),
      ).rejects.toThrow(AmbiguousRequestError);
    });

    it('should reject excessively short objectives', async () => {
      await expect(
        planner.plan({
          projectId: 'proj_123',
          objective: 'fix it',
        }),
      ).rejects.toThrow(AmbiguousRequestError);
    });

    it('should reject vague objectives like "help me please"', async () => {
      await expect(
        planner.plan({
          projectId: 'proj_123',
          objective: 'help me please',
        }),
      ).rejects.toThrow(AmbiguousRequestError);
    });
  });

  describe('Decomposition & Plan Generation', () => {
    it('should generate a structured multi-agent plan for a feature implementation objective', async () => {
      const result = await planner.plan({
        projectId: 'proj_alpha',
        objective: 'Implement OAuth2 Google authentication login and token refresh flow',
        context: { framework: 'Fastify' },
      });

      expect(result.plan).toBeDefined();
      expect(result.plan!.tasks.length).toBeGreaterThanOrEqual(3);

      // Verify that tasks include Coordinator, Developer, QA, and Reviewer roles
      const roles = result.plan!.tasks.map(t => t.suggestedRole);
      expect(roles).toContain(AgentRole.COORDINATOR);
      expect(roles).toContain(AgentRole.DEVELOPER);
      expect(roles).toContain(AgentRole.QA);
      expect(roles).toContain(AgentRole.REVIEWER);

      // Verify dependencies: Coordinator -> Developer -> QA -> Reviewer
      const specTask = result.plan!.tasks.find(t => t.suggestedRole === AgentRole.COORDINATOR);
      const devTask = result.plan!.tasks.find(t => t.suggestedRole === AgentRole.DEVELOPER);
      const qaTask = result.plan!.tasks.find(t => t.suggestedRole === AgentRole.QA);
      const revTask = result.plan!.tasks.find(t => t.suggestedRole === AgentRole.REVIEWER);

      expect(specTask?.dependencies).toHaveLength(0);
      expect(devTask?.dependencies).toContain(specTask?.tempId);
      expect(qaTask?.dependencies).toContain(devTask?.tempId);
      expect(revTask?.dependencies).toContain(qaTask?.tempId);

      // Validate against Zod schemas
      const validated = structuredExecutionPlanSchema.safeParse(result.plan);
      expect(validated.success).toBe(true);
    });

    it('should generate a targeted plan for bug fix requests with HIGH priority', async () => {
      const result = await planner.plan({
        projectId: 'proj_alpha',
        objective: 'Fix memory leak error when streaming large WebSocket frames',
      });

      expect(result.plan).toBeDefined();
      const firstTask = result.plan!.tasks[0];
      expect(firstTask.priority).toBe(TaskPriority.HIGH);
      expect(firstTask.title.toLowerCase()).toContain('root cause');
    });

    it('should correctly schema-validate individual planned tasks', () => {
      const validTask = {
        tempId: 'plan_task_01',
        title: 'Author database schema migration',
        description: 'Add new orchestration tables to PostgreSQL with Prisma',
        expectedOutcome: 'Database migration created and applied',
        suggestedRole: AgentRole.DEVELOPER,
        priority: TaskPriority.HIGH,
        requiredCapabilities: ['code_implementation', 'database_design'],
        dependencies: [],
        estimatedComplexity: 'MEDIUM' as const,
        completionCriteria: ['Migration file generated', 'Prisma client updated'],
      };

      const parsed = plannedTaskSchema.safeParse(validTask);
      expect(parsed.success).toBe(true);
    });
  });
});
