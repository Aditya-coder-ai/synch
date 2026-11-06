import { BadRequestError } from '../common/errors/app-error.js';

/**
 * Validates that a task is not assigned to both a human and an AI agent simultaneously.
 */
export function validateTaskAssignment(
  assignedUserId?: string | null,
  assignedAgentId?: string | null,
): void {
  if (assignedUserId && assignedAgentId) {
    throw new BadRequestError(
      'A task cannot be assigned to both a human user and an AI agent simultaneously',
      { assignedUserId, assignedAgentId },
    );
  }
}

/**
 * Validates that a task does not depend on itself.
 */
export function validateTaskSelfDependency(taskId: string, dependsOnTaskId: string): void {
  if (taskId === dependsOnTaskId) {
    throw new BadRequestError('A task cannot depend on itself', {
      taskId,
      dependsOnTaskId,
    });
  }
}

/**
 * Validates that dependency relationships cannot cross projects.
 */
export function validateCrossProjectDependency(
  taskProjectId: string,
  dependsOnTaskProjectId: string,
): void {
  if (taskProjectId !== dependsOnTaskProjectId) {
    throw new BadRequestError(
      'Task dependencies across different projects are not permitted',
      { taskProjectId, dependsOnTaskProjectId },
    );
  }
}

/**
 * Application-level cycle detection in task dependency DAGs using Depth-First Search.
 * Returns true if adding an edge (taskId -> newDependsOnTaskId) would create a cycle.
 *
 * @param adjacencyList Map of taskId -> array of taskIds that taskId depends on
 * @param taskId The task having a dependency added
 * @param newDependsOnTaskId The candidate dependency task
 */
export function detectDependencyCycle(
  adjacencyList: Map<string, string[]>,
  taskId: string,
  newDependsOnTaskId: string,
): boolean {
  if (taskId === newDependsOnTaskId) {
    return true;
  }

  // If candidate newDependsOnTaskId reaches taskId via existing dependencies, adding this edge creates a cycle
  const visited = new Set<string>();
  const queue: string[] = [newDependsOnTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) {
      return true;
    }

    if (!visited.has(current)) {
      visited.add(current);
      const downstream = adjacencyList.get(current) || [];
      for (const next of downstream) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return false;
}
