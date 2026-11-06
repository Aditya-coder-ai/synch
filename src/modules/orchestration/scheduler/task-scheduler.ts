import { TaskStatus } from '../../../database/types.js';
import type { DependencyGraph } from './dependency-graph.js';
import type { SchedulerEvaluationResult, TaskGraphNode } from './scheduler.types.js';

export class TaskScheduler {
  constructor(private readonly graph: DependencyGraph) {}

  /**
   * Updates a task status directly in the underlying graph.
   */
  public updateTaskStatus(taskId: string, status: TaskStatus): void {
    const node = this.graph.getNode(taskId);
    if (node) {
      node.status = status;
    }
  }

  /**
   * Evaluates the current state of all tasks and categorizes them:
   * - ready: tasks in BACKLOG/TODO whose prerequisites are all COMPLETED
   * - blocked: tasks in BACKLOG/TODO whose prerequisites are pending
   * - failedPrerequisites: tasks whose prerequisites ended in CANCELLED or BLOCKED
   * - inProgress: tasks currently IN_PROGRESS or IN_REVIEW
   * - completed: tasks marked COMPLETED
   */
  public evaluate(): SchedulerEvaluationResult {
    const nodes = this.graph.getAllNodes();
    const nodeMap = new Map<string, TaskGraphNode>(nodes.map(n => [n.id, n]));

    const readyTaskIds: string[] = [];
    const blockedTaskIds: string[] = [];
    const failedPrerequisiteTaskIds: string[] = [];
    const completedTaskIds: string[] = [];
    const inProgressTaskIds: string[] = [];

    for (const node of nodes) {
      if (node.status === TaskStatus.COMPLETED) {
        completedTaskIds.push(node.id);
        continue;
      }

      if (node.status === TaskStatus.IN_PROGRESS || node.status === TaskStatus.IN_REVIEW) {
        inProgressTaskIds.push(node.id);
        continue;
      }

      if (node.status === TaskStatus.CANCELLED || node.status === TaskStatus.BLOCKED) {
        continue;
      }

      // Check all dependencies
      if (node.dependencies.length === 0) {
        readyTaskIds.push(node.id);
        continue;
      }

      let allPrerequisitesCompleted = true;
      let hasPrerequisiteFailed = false;

      for (const depId of node.dependencies) {
        const dep = nodeMap.get(depId);
        if (!dep) {
          allPrerequisitesCompleted = false;
          break;
        }

        if (dep.status === TaskStatus.CANCELLED || dep.status === TaskStatus.BLOCKED) {
          hasPrerequisiteFailed = true;
          allPrerequisitesCompleted = false;
          break;
        }

        if (dep.status !== TaskStatus.COMPLETED) {
          allPrerequisitesCompleted = false;
        }
      }

      if (hasPrerequisiteFailed) {
        failedPrerequisiteTaskIds.push(node.id);
      } else if (allPrerequisitesCompleted) {
        readyTaskIds.push(node.id);
      } else {
        blockedTaskIds.push(node.id);
      }
    }

    const allCompleted = nodes.length > 0 && completedTaskIds.length === nodes.length;
    const hasFailures = failedPrerequisiteTaskIds.length > 0;

    return {
      readyTaskIds,
      blockedTaskIds,
      failedPrerequisiteTaskIds,
      completedTaskIds,
      inProgressTaskIds,
      allCompleted,
      hasFailures,
    };
  }
}
