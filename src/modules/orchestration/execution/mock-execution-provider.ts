import { ExecutionStatus } from '../../../database/types.js';
import type {
  AgentExecutionInput,
  AgentExecutionProvider,
  AgentExecutionResult,
  AgentExecutionStepEvent,
} from './execution.interface.js';

export interface MockExecutionOptions {
  simulatedDelayMs?: number;
  shouldFailTaskIds?: string[];
  shouldFailAll?: boolean;
  customFailureMessages?: Record<string, string>;
}

export class MockAgentExecutionProvider implements AgentExecutionProvider {
  private readonly executions = new Map<string, ExecutionStatus>();
  private readonly options: MockExecutionOptions;

  constructor(options: MockExecutionOptions = {}) {
    this.options = {
      simulatedDelayMs: options.simulatedDelayMs ?? 5,
      shouldFailTaskIds: options.shouldFailTaskIds ?? [],
      shouldFailAll: options.shouldFailAll ?? false,
      customFailureMessages: options.customFailureMessages ?? {},
    };
  }

  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString();
    this.executions.set(input.executionId, ExecutionStatus.RUNNING);

    const events: AgentExecutionStepEvent[] = [
      {
        eventType: 'EXECUTION_STARTED',
        message: `Agent '${input.agentId}' started execution on task '${input.title}'`,
        timestamp: startedAt,
      },
    ];

    if (this.options.simulatedDelayMs && this.options.simulatedDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.simulatedDelayMs));
    }

    const shouldFail = this.options.shouldFailAll || this.options.shouldFailTaskIds?.includes(input.taskId);

    if (shouldFail) {
      const completedAt = new Date().toISOString();
      const errorMessage =
        this.options.customFailureMessages?.[input.taskId] ||
        `Mock execution failure for task '${input.taskId}'`;

      events.push({
        eventType: 'EXECUTION_FAILED',
        message: errorMessage,
        timestamp: completedAt,
      });

      this.executions.set(input.executionId, ExecutionStatus.FAILED);

      return {
        executionId: input.executionId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: ExecutionStatus.FAILED,
        error: errorMessage,
        events,
        startedAt,
        completedAt,
        durationMs: this.options.simulatedDelayMs || 5,
      };
    }

    // Normal successful execution progression
    events.push({
      eventType: 'TASK_STEP_PROGRESS',
      message: `Completed processing requirements for capabilities: ${input.requiredCapabilities.join(', ')}`,
      timestamp: new Date().toISOString(),
    });

    const completedAt = new Date().toISOString();
    events.push({
      eventType: 'EXECUTION_SUCCEEDED',
      message: `Agent '${input.agentId}' successfully completed task '${input.taskId}'`,
      timestamp: completedAt,
    });

    this.executions.set(input.executionId, ExecutionStatus.SUCCEEDED);

    return {
      executionId: input.executionId,
      taskId: input.taskId,
      agentId: input.agentId,
      status: ExecutionStatus.SUCCEEDED,
      output: {
        evidence: `Verified outcome for task '${input.title}'`,
        artifacts: [`artifact_${input.taskId}.ts`],
        summary: `Execution completed successfully by agent ${input.agentId}`,
      },
      events,
      startedAt,
      completedAt,
      durationMs: this.options.simulatedDelayMs || 5,
    };
  }

  async cancel(executionId: string): Promise<void> {
    this.executions.set(executionId, ExecutionStatus.CANCELLED);
  }

  async getStatus(executionId: string): Promise<ExecutionStatus> {
    return this.executions.get(executionId) || ExecutionStatus.QUEUED;
  }
}
