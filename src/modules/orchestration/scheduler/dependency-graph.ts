import { DependencyCycleError, DependencyGraphError } from '../core/orchestration.errors.js';
import type {
  DependencyGraphValidationResult,
  SchedulingTier,
  TaskGraphNode,
} from './scheduler.types.js';

export class DependencyGraph {
  private readonly nodes: Map<string, TaskGraphNode> = new Map();

  constructor(tasks: TaskGraphNode[] = []) {
    for (const task of tasks) {
      this.addNode(task);
    }
  }

  public addNode(task: TaskGraphNode): void {
    this.nodes.set(task.id, {
      ...task,
      dependencies: [...task.dependencies],
    });
  }

  public getNode(id: string): TaskGraphNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): TaskGraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Validates the dependency graph for missing nodes, cycles, and cross-project violations.
   */
  public validate(): DependencyGraphValidationResult {
    const errors: string[] = [];
    const missingDependencies: { taskId: string; missingDependencyId: string }[] = [];
    const crossProjectDependencies: { taskId: string; dependsOnTaskId: string }[] = [];

    // 1. Check self-dependencies and missing dependencies
    for (const [id, node] of this.nodes.entries()) {
      for (const depId of node.dependencies) {
        if (depId === id) {
          errors.push(`Task '${id}' cannot depend on itself`);
        }

        const depNode = this.nodes.get(depId);
        if (!depNode) {
          missingDependencies.push({ taskId: id, missingDependencyId: depId });
          errors.push(`Task '${id}' depends on missing task '${depId}'`);
        } else if (depNode.projectId !== node.projectId) {
          crossProjectDependencies.push({ taskId: id, dependsOnTaskId: depId });
          errors.push(
            `Cross-project dependency: Task '${id}' (${node.projectId}) cannot depend on Task '${depId}' (${depNode.projectId})`,
          );
        }
      }
    }

    // 2. Cycle Detection using DFS with 3-color marking
    // 0: unvisited, 1: visiting (in current recursion stack), 2: visited
    const state = new Map<string, number>();
    let cycleNodes: string[] = [];
    let hasCycle = false;

    const dfs = (currentId: string, path: string[]): boolean => {
      state.set(currentId, 1);
      const node = this.nodes.get(currentId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!this.nodes.has(depId)) continue;

          const depState = state.get(depId) || 0;
          if (depState === 1) {
            // Found cycle!
            const cycleStartIdx = path.indexOf(depId);
            cycleNodes = [...path.slice(cycleStartIdx), depId];
            hasCycle = true;
            return true;
          }
          if (depState === 0) {
            if (dfs(depId, [...path, depId])) {
              return true;
            }
          }
        }
      }
      state.set(currentId, 2);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if ((state.get(id) || 0) === 0) {
        if (dfs(id, [id])) {
          errors.push(`Circular dependency detected: ${cycleNodes.join(' -> ')}`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      hasCycle,
      ...(cycleNodes.length > 0 ? { cycleNodes } : {}),
      ...(missingDependencies.length > 0 ? { missingDependencies } : {}),
      ...(crossProjectDependencies.length > 0 ? { crossProjectDependencies } : {}),
      errors,
    };
  }

  /**
   * Asserts validity or throws DependencyCycleError or DependencyGraphError.
   */
  public assertValid(): void {
    const result = this.validate();
    if (result.hasCycle) {
      throw new DependencyCycleError(
        `Circular dependency detected: ${(result.cycleNodes || []).join(' -> ')}`,
        { cycleNodes: result.cycleNodes },
      );
    }
    if (!result.isValid) {
      throw new DependencyGraphError(`Invalid dependency graph: ${result.errors.join('; ')}`, {
        validation: result,
      });
    }
  }

  /**
   * Returns tasks that have zero dependencies (independent roots).
   */
  public getRootTasks(): TaskGraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.dependencies.length === 0);
  }

  /**
   * Computes execution tiers for parallel scheduling.
   * Tier 0: tasks with 0 dependencies.
   * Tier N: tasks whose dependencies all belong to Tier < N.
   */
  public getExecutionTiers(): SchedulingTier[] {
    this.assertValid();

    const inDegree = new Map<string, number>();
    const dependentsMap = new Map<string, string[]>();

    for (const [id, node] of this.nodes.entries()) {
      inDegree.set(id, node.dependencies.length);
      for (const depId of node.dependencies) {
        const list = dependentsMap.get(depId) || [];
        list.push(id);
        dependentsMap.set(depId, list);
      }
    }

    const tiers: SchedulingTier[] = [];
    let currentTier = Array.from(inDegree.entries())
      .filter(([_, count]) => count === 0)
      .map(([id]) => id);

    let tierIndex = 0;
    const processed = new Set<string>();

    while (currentTier.length > 0) {
      tiers.push({
        tierIndex,
        taskIds: [...currentTier],
      });

      for (const id of currentTier) {
        processed.add(id);
      }

      const nextTier: string[] = [];
      for (const id of currentTier) {
        const dependents = dependentsMap.get(id) || [];
        for (const dep of dependents) {
          if (processed.has(dep)) continue;

          const remaining = (inDegree.get(dep) || 1) - 1;
          inDegree.set(dep, remaining);

          if (remaining === 0) {
            nextTier.push(dep);
          }
        }
      }

      currentTier = nextTier;
      tierIndex++;
    }

    return tiers;
  }
}
