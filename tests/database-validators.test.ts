import { describe, it, expect } from 'vitest';
import {
  validateTaskAssignment,
  validateTaskSelfDependency,
  validateCrossProjectDependency,
  detectDependencyCycle,
} from '../src/database/validators.js';
import { BadRequestError } from '../src/common/errors/app-error.js';

describe('Database Application-Level Validators', () => {
  describe('validateTaskAssignment', () => {
    it('should allow assigning only a human user', () => {
      expect(() => validateTaskAssignment('user_123', null)).not.toThrow();
      expect(() => validateTaskAssignment('user_123', undefined)).not.toThrow();
    });

    it('should allow assigning only an AI agent', () => {
      expect(() => validateTaskAssignment(null, 'agent_456')).not.toThrow();
      expect(() => validateTaskAssignment(undefined, 'agent_456')).not.toThrow();
    });

    it('should allow unassigned tasks (neither user nor agent)', () => {
      expect(() => validateTaskAssignment(null, null)).not.toThrow();
      expect(() => validateTaskAssignment(undefined, undefined)).not.toThrow();
    });

    it('should throw BadRequestError when both user and agent are assigned simultaneously', () => {
      expect(() => validateTaskAssignment('user_123', 'agent_456')).toThrowError(BadRequestError);
      expect(() => validateTaskAssignment('user_123', 'agent_456')).toThrowError(
        /cannot be assigned to both a human user and an AI agent simultaneously/,
      );
    });
  });

  describe('validateTaskSelfDependency', () => {
    it('should allow distinct tasks in a dependency relationship', () => {
      expect(() => validateTaskSelfDependency('task_1', 'task_2')).not.toThrow();
    });

    it('should throw BadRequestError when a task attempts to depend on itself', () => {
      expect(() => validateTaskSelfDependency('task_1', 'task_1')).toThrowError(BadRequestError);
      expect(() => validateTaskSelfDependency('task_1', 'task_1')).toThrowError(
        /cannot depend on itself/,
      );
    });
  });

  describe('validateCrossProjectDependency', () => {
    it('should allow dependency when both tasks are in the same project', () => {
      expect(() => validateCrossProjectDependency('proj_abc', 'proj_abc')).not.toThrow();
    });

    it('should throw BadRequestError when tasks belong to different projects', () => {
      expect(() => validateCrossProjectDependency('proj_abc', 'proj_xyz')).toThrowError(
        BadRequestError,
      );
      expect(() => validateCrossProjectDependency('proj_abc', 'proj_xyz')).toThrowError(
        /across different projects are not permitted/,
      );
    });
  });

  describe('detectDependencyCycle', () => {
    it('should detect a direct self-dependency as a cycle', () => {
      const graph = new Map<string, string[]>();
      expect(detectDependencyCycle(graph, 'A', 'A')).toBe(true);
    });

    it('should detect a 2-node cycle (A -> B -> A)', () => {
      // Graph already has B depending on A: B -> [A]
      // Attempting to add A -> B creates a cycle
      const graph = new Map<string, string[]>([['B', ['A']]]);
      expect(detectDependencyCycle(graph, 'A', 'B')).toBe(true);
    });

    it('should detect a multi-node cycle (A -> B -> C -> A)', () => {
      // B depends on C, C depends on A: B -> [C], C -> [A]
      // Attempting to make A depend on B creates A -> B -> C -> A cycle
      const graph = new Map<string, string[]>([
        ['B', ['C']],
        ['C', ['A']],
      ]);
      expect(detectDependencyCycle(graph, 'A', 'B')).toBe(true);
    });

    it('should allow valid acyclic DAG additions', () => {
      // B -> [C], C -> [D]
      // Adding A -> B does not create any cycle
      const graph = new Map<string, string[]>([
        ['B', ['C']],
        ['C', ['D']],
      ]);
      expect(detectDependencyCycle(graph, 'A', 'B')).toBe(false);
    });

    it('should allow diamond dependency graphs (A -> B -> D, A -> C -> D)', () => {
      const graph = new Map<string, string[]>([
        ['B', ['D']],
        ['C', ['D']],
      ]);
      // A can depend on both B and C without forming a cycle
      expect(detectDependencyCycle(graph, 'A', 'B')).toBe(false);
      expect(detectDependencyCycle(graph, 'A', 'C')).toBe(false);
    });
  });
});

