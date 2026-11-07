import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ExecutionStatus } from '../../../database/types.js';
import { ExecutionDispatchError } from '../core/orchestration.errors.js';
import type {
  AgentExecutionInput,
  AgentExecutionProvider,
  AgentExecutionResult,
} from './execution.interface.js';
import { ExecutionStreamBroker, executionStreamBroker } from '../stream/stream.broker.js';
import { StreamEventType } from '../stream/stream.types.js';

export interface ExecutionDispatcherOptions {
  prismaClient?: PrismaClient;
  provider: AgentExecutionProvider;
  streamBroker?: ExecutionStreamBroker;
}

export class ExecutionDispatcher {
  private readonly prisma: PrismaClient;
  private readonly provider: AgentExecutionProvider;
  private readonly broker: ExecutionStreamBroker;

  constructor(options: ExecutionDispatcherOptions) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.provider = options.provider;
    this.broker = options.streamBroker ?? executionStreamBroker;
  }

  /**
   * Dispatches an individual task execution to the provider and records audit events.
   */
  async dispatch(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const orchestrationId = (input.context?.orchestrationId as string) || undefined;

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

    if (orchestrationId) {
      this.broker.publish(orchestrationId, {
        eventType: StreamEventType.TASK_STATUS,
        message: `Task '${input.title}' (${input.taskId}) dispatched to agent '${input.agentId}'`,
        data: {
          taskId: input.taskId,
          agentId: input.agentId,
          status: ExecutionStatus.RUNNING,
          title: input.title,
        },
      });
    }

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

        if (orchestrationId) {
          const isStdout = evt.eventType.includes('STDOUT') || evt.eventType.includes('PROGRESS');
          this.broker.publish(orchestrationId, {
            eventType: isStdout ? StreamEventType.RUNTIME_STDOUT : StreamEventType.ORCHESTRATION_EVENT,
            message: `[${input.title}] ${evt.message}`,
            data: {
              taskId: input.taskId,
              agentId: input.agentId,
              eventType: evt.eventType,
              payload: evt.payload,
            },
          });
        }
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

      if (orchestrationId) {
        this.broker.publish(orchestrationId, {
          eventType: StreamEventType.TASK_STATUS,
          message: `Task '${input.title}' (${input.taskId}) ${result.status}`,
          data: {
            taskId: input.taskId,
            agentId: input.agentId,
            status: result.status,
            durationMs: result.durationMs,
          },
        });
      }

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

      if (orchestrationId) {
        this.broker.publish(orchestrationId, {
          eventType: StreamEventType.TASK_STATUS,
          message: `Task '${input.title}' execution failed: ${errorMessage}`,
          data: {
            taskId: input.taskId,
            agentId: input.agentId,
            status: ExecutionStatus.FAILED,
            error: errorMessage,
          },
        });
      }

      throw new ExecutionDispatchError(
        `Failed executing task '${input.taskId}' on agent '${input.agentId}': ${errorMessage}`,
        { executionId: execution.id, taskId: input.taskId },
      );
    }
  }
}
