import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ExecutionStatus } from '../../../database/types.js';
import { ExecutionDispatchError } from '../core/orchestration.errors.js';
import type {
  AgentExecutionInput,
  AgentExecutionProvider,
  AgentExecutionResult,
} from './execution.interface.js';

export interface ExecutionDispatcherOptions {
  prismaClient?: PrismaClient;
  provider: AgentExecutionProvider;
}

export class ExecutionDispatcher {
  private readonly prisma: PrismaClient;
  private readonly provider: AgentExecutionProvider;

  constructor(options: ExecutionDispatcherOptions) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.provider = options.provider;
  }

  /**
   * Dispatches an individual task execution to the provider and records audit events.
   */
  async dispatch(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    // 1. Create the persistent Execution record in QUEUED status
    const execution = await this.prisma.execution.create({
      data: {
        id: input.executionId,
        projectId: input.projectId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: ExecutionStatus.QUEUED,
        input: (input.context as unknown as Prisma.InputJsonValue) ?? {},
      },
    });

    // 2. Record initial event
    await this.prisma.executionEvent.create({
      data: {
        executionId: execution.id,
        eventType: 'EXECUTION_DISPATCHED',
        message: `Task '${input.taskId}' dispatched to agent '${input.agentId}'`,
        payload: { title: input.title },
      },
    });

    // 3. Update status to RUNNING
    await this.prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      // 4. Delegate to the provider
      const result = await this.provider.execute(input);

      // 5. Persist the events emitted by the provider
      for (const evt of result.events) {
        await this.prisma.executionEvent.create({
          data: {
            executionId: execution.id,
            eventType: evt.eventType,
            message: evt.message,
            payload: (evt.payload as unknown as Prisma.InputJsonValue) ?? {},
            createdAt: new Date(evt.timestamp),
          },
        });
      }

      // 6. Update the Execution record with the final outcome
      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: result.status,
          output: (result.output as unknown as Prisma.InputJsonValue) ?? {},
          error: result.error || null,
          completedAt: new Date(result.completedAt),
        },
      });

      return result;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown execution provider error';

      await this.prisma.executionEvent.create({
        data: {
          executionId: execution.id,
          eventType: 'DISPATCH_FAILURE',
          message: `Execution failed: ${errorMessage}`,
          payload: { error: errorMessage },
        },
      });

      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      throw new ExecutionDispatchError(
        `Failed executing task '${input.taskId}' on agent '${input.agentId}': ${errorMessage}`,
        { executionId: execution.id, taskId: input.taskId },
      );
    }
  }
}
