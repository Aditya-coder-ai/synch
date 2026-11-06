import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../src/modules/orchestration/scheduler/dependency-graph.js';
import { TaskScheduler } from '../../src/modules/orchestration/scheduler/task-scheduler.js';
import { DependencyCycleError } from '../../src/modules/orchestration/core/orchestration.errors.js';
import { TaskStatus } from '../../src/database/types.js';

describe('Dependency Graph & DAG Scheduler', () => {
  describe('Cycle Detection & Validation', () => {
    it('should detect a direct two-node circular dependency', () => {
      const graph = new DependencyGraph();
      graph.addNode({ id: 'task_A', projectId: 'proj_1', dependencies: ['task_B'] });
      graph.addNode({ id: 'task_B', projectId: 'proj_1', dependencies: ['task_A'] });

      expect(() => graph.assertValid()).toThrow(DependencyCycleError);
    });

    it('should detect an indirect multi-node circular dependency (A -> B -> C -> A)', () => {
      const graph = new DependencyGraph();
      graph.addNode({ id: 'task_A', projectId: 'proj_1', dependencies: ['task_C'] });
      graph.addNode({ id: 'task_B', projectId: 'proj_1', dependencies: ['task_A'] });
      graph.addNode({ id: 'task_C', projectId: 'proj_1', dependencies: ['task_B'] });

      expect(() => graph.assertValid()).toThrow(DependencyCycleError);
    });

    it('should detect missing dependencies when a node depends on an unregistered task', () => {
      const graph = new DependencyGraph();
      graph.addNode({ id: 'task_A', projectId: 'proj_1', dependencies: ['task_non_existent'] });

      const validation = graph.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.missingDependencies).toBeDefined();
      expect(validation.missingDependencies![0].missingDependencyId).toBe('task_non_existent');
    });

    it('should reject dependencies crossing project boundaries', () => {
      const graph = new DependencyGraph();
      graph.addNode({ id: 'task_A', projectId: 'proj_1', dependencies: [] });
      graph.addNode({ id: 'task_B', projectId: 'proj_2', dependencies: ['task_A'] });

      const validation = graph.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.crossProjectDependencies).toBeDefined();
      expect(validation.crossProjectDependencies!.length).toBeGreaterThan(0);
    });
  });

  describe('Topological Scheduling Tiers', () => {
    it('should group independent tasks into Tier 0 and dependent tasks into subsequent tiers', () => {
      const graph = new DependencyGraph();
      // Dev tasks (independent)
      graph.addNode({ id: 'dev_1', projectId: 'proj_1', dependencies: [] });
      graph.addNode({ id: 'dev_2', projectId: 'proj_1', dependencies: [] });
      // QA task depends on both dev tasks
      graph.addNode({ id: 'qa_1', projectId: 'proj_1', dependencies: ['dev_1', 'dev_2'] });
      // Reviewer task depends on QA task
      graph.addNode({ id: 'rev_1', projectId: 'proj_1', dependencies: ['qa_1'] });

      const tiers = graph.getExecutionTiers();
      expect(tiers).toHaveLength(3);

      expect(tiers[0].tierIndex).toBe(0);
      expect(tiers[0].taskIds.sort()).toEqual(['dev_1', 'dev_2'].sort());

      expect(tiers[1].tierIndex).toBe(1);
      expect(tiers[1].taskIds).toEqual(['qa_1']);

      expect(tiers[2].tierIndex).toBe(2);
      expect(tiers[2].taskIds).toEqual(['rev_1']);
    });
  });

  describe('Task Scheduler Evaluation & Failure Propagation', () => {
    it('should identify ready tasks, unlock downstream tasks upon completion, and track failed prerequisites', () => {
      const graph = new DependencyGraph();
      graph.addNode({ id: 'task_1', projectId: 'proj_1', dependencies: [] });
      graph.addNode({ id: 'task_2', projectId: 'proj_1', dependencies: ['task_1'] });
      graph.addNode({ id: 'task_3', projectId: 'proj_1', dependencies: ['task_2'] });

      const scheduler = new TaskScheduler(graph);

      // Step 1: Initial state
      let evaluation = scheduler.evaluate();
      expect(evaluation.readyTaskIds).toEqual(['task_1']);
      expect(evaluation.blockedTaskIds).toEqual(['task_2', 'task_3']);
      expect(evaluation.allCompleted).toBe(false);

      // Step 2: Task 1 completes
      scheduler.updateTaskStatus('task_1', TaskStatus.COMPLETED);
      evaluation = scheduler.evaluate();
      expect(evaluation.readyTaskIds).toEqual(['task_2']);
      expect(evaluation.completedTaskIds).toEqual(['task_1']);
      expect(evaluation.blockedTaskIds).toEqual(['task_3']);

      // Step 3: Task 2 fails
      scheduler.updateTaskStatus('task_2', TaskStatus.BLOCKED);
      evaluation = scheduler.evaluate();
      expect(evaluation.readyTaskIds).toEqual([]);
      expect(evaluation.failedPrerequisiteTaskIds).toContain('task_3');
      expect(evaluation.allCompleted).toBe(false);
    });
  });
});
