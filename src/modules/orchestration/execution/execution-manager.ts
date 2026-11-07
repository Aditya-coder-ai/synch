import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ExecutionStatus, TaskStatus } from '../../../database/types.js';
import type { DependencyGraph } from '../scheduler/dependency-graph.js';
import { TaskScheduler } from '../scheduler/task-scheduler.js';
import type { ExecutionDispatcher } from './execution-dispatcher.js';
import type { AgentExecutionInput, AgentExecutionResult } from './execution.interface.js';

export interface ExecutionManagerOptions {
  prismaClient?: PrismaClient;
  dispatcher: ExecutionDispatcher;
}

export interface StepHandoffSummary {
  taskId: string;
  agentId: string;
  executionId: string;
  status: ExecutionStatus;
  success: boolean;
  unlockedTaskIds: string[];
}

export class ExecutionManager {
  private readonly prisma: PrismaClient;
  private readonly dispatcher: ExecutionDispatcher;

  constructor(options: ExecutionManagerOptions) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.dispatcher = options.dispatcher;
  }

  /**
   * Executes a single task and processes the handoff outcome.
   * If successful: marks task COMPLETED, unlocks dependent tasks.
   * If failed: marks task BLOCKED / CANCELLED, does NOT unlock dependent tasks.
   */
  async processTaskExecution(
    input: AgentExecutionInput,
    graph: DependencyGraph,
  ): Promise<StepHandoffSummary> {
    // 1. Update task to IN_PROGRESS
    await this.prisma.task.update({
      where: { id: input.taskId },
      data: {
        status: TaskStatus.IN_PROGRESS,
      },
    });

    const node = graph.getNode(input.taskId);
    if (node) {
      node.status = TaskStatus.IN_PROGRESS;
    }

    // 2. Dispatch execution
    const result: AgentExecutionResult = await this.dispatcher.dispatch(input);
    const success = result.status === ExecutionStatus.SUCCEEDED;

    // 3. Update task status according to execution evidence
    const finalTaskStatus = success ? TaskStatus.COMPLETED : TaskStatus.BLOCKED;
    await this.prisma.task.update({
      where: { id: input.taskId },
      data: {
        status: finalTaskStatus,
        completedAt: success ? new Date() : null,
      },
    });

    if (node) {
      node.status = finalTaskStatus;
    }

    // 4. Evaluate graph to determine newly unlocked ready tasks
    const scheduler = new TaskScheduler(graph);
    const evaluation = scheduler.evaluate();
    const unlockedTaskIds = success ? evaluation.readyTaskIds : [];

    return {
      taskId: input.taskId,
      agentId: input.agentId,
      executionId: input.executionId,
      status: result.status,
      success,
      unlockedTaskIds,
    };
  }

  /**
   * Runs all tasks in dependency order until completion or unresolvable failure.
   */
  async executeAll(
    tasks: { id: string; title: string; description: string | null; projectId: string; orchestrationId?: string | null; assignedAgentId: string | null; requiredCapabilities?: string[] }[],
    graph: DependencyGraph,
  ): Promise<{
    completedTaskIds: string[];
    failedTaskIds: string[];
    handoffs: StepHandoffSummary[];
  }> {
    const handoffs: StepHandoffSummary[] = [];
    const completedTaskIds: string[] = [];
    const failedTaskIds: string[] = [];

    const scheduler = new TaskScheduler(graph);

    // Iterative scheduling loop
    while (true) {
      const evaluation = scheduler.evaluate();

      if (evaluation.allCompleted) {
        break;
      }

      if (evaluation.readyTaskIds.length === 0) {
        // No ready tasks left: either all done, or remaining tasks are blocked/failed
        for (const blockedId of evaluation.blockedTaskIds) {
          failedTaskIds.push(blockedId);
        }
        for (const failedDepId of evaluation.failedPrerequisiteTaskIds) {
          failedTaskIds.push(failedDepId);
        }
        break;
      }

      // Process current wave of parallel-ready tasks
      for (const readyTaskId of evaluation.readyTaskIds) {
        const taskRecord = tasks.find(t => t.id === readyTaskId);
        if (!taskRecord || !taskRecord.assignedAgentId) {
          failedTaskIds.push(readyTaskId);
          continue;
        }

        const executionInput: AgentExecutionInput = {
          executionId: `exec_${crypto.randomUUID().slice(0, 8)}`,
          taskId: taskRecord.id,
          agentId: taskRecord.assignedAgentId,
          projectId: taskRecord.projectId,
          title: taskRecord.title,
          description: taskRecord.description || '',
          requiredCapabilities: taskRecord.requiredCapabilities || [],
          context: {
            orchestrationId: taskRecord.orchestrationId,
          },
        };

        const handoff = await this.processTaskExecution(executionInput, graph);
        handoffs.push(handoff);

        if (handoff.success) {
          completedTaskIds.push(handoff.taskId);
        } else {
          failedTaskIds.push(handoff.taskId);
        }
      }
    }

    return {
      completedTaskIds,
      failedTaskIds,
      handoffs,
    };
  }
}
