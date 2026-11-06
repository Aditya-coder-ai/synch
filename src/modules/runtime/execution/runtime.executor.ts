import type { PrismaClient } from '@prisma/client';
import { ExecutionStatus } from '../../../database/types.js';
import type {
  AgentExecutionInput,
  AgentExecutionProvider,
  AgentExecutionResult,
  AgentExecutionStepEvent,
} from '../../orchestration/execution/execution.interface.js';
import type { OpenCodeClient } from '../opencode/opencode.client.js';
import { OpenCodeAgentMapper } from '../opencode/opencode.agent.js';
import { OpenCodeSessionManager } from '../opencode/opencode.session.js';
import type { WorkspaceManager } from '../workspace/workspace.manager.js';
import { ExecutionMonitor } from './execution.monitor.js';
import { ResultVerifier } from './execution.verifier.js';
import { OpenCodeUnavailableError } from '../opencode/opencode.errors.js';
import { AgentRole } from '../../../database/types.js';

export interface OpenCodeExecutionProviderOptions {
  client: OpenCodeClient;
  workspaceManager: WorkspaceManager;
  prismaClient?: PrismaClient;
  monitor?: ExecutionMonitor;
}

export class OpenCodeExecutionProvider implements AgentExecutionProvider {
  private readonly client: OpenCodeClient;
  private readonly sessionManager: OpenCodeSessionManager;
  private readonly workspaceManager: WorkspaceManager;
  private readonly monitor: ExecutionMonitor;
  private readonly executionToSessionMap = new Map<string, string>();
  private readonly executionStatuses = new Map<string, ExecutionStatus>();

  constructor(options: OpenCodeExecutionProviderOptions) {
    this.client = options.client;
    this.sessionManager = new OpenCodeSessionManager(this.client);
    this.workspaceManager = options.workspaceManager;
    this.monitor = options.monitor ?? new ExecutionMonitor({ prismaClient: options.prismaClient });
  }

  /**
   * Executes a task using the real OpenCode server runtime.
   */
  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();
    const events: AgentExecutionStepEvent[] = [];

    const recordStep = (eventType: string, message: string, payload: Record<string, unknown> = {}) => {
      events.push({
        eventType,
        message,
        payload,
        timestamp: new Date().toISOString(),
      });
      void this.monitor.logEvent(input.executionId, eventType, message, payload).catch(() => {});
    };

    this.executionStatuses.set(input.executionId, ExecutionStatus.RUNNING);
    recordStep('RUNTIME_INITIALIZING', `Initializing OpenCode runtime for task '${input.taskId}'`);

    // 1. Verify OpenCode server connectivity
    try {
      const health = await this.client.checkHealth();
      if (!health.healthy) {
        throw new OpenCodeUnavailableError(`OpenCode server reported unhealthy: version ${health.version}`);
      }
      recordStep('RUNTIME_CONNECTED', `Connected to OpenCode server v${health.version}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.executionStatuses.set(input.executionId, ExecutionStatus.FAILED);
      recordStep('RUNTIME_UNAVAILABLE', `OpenCode server unavailable: ${errorMsg}`);
      return {
        executionId: input.executionId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: ExecutionStatus.FAILED,
        error: `OpenCode execution failed: Server unavailable (${errorMsg})`,
        events,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 2. Prepare isolated project workspace and acquire write lock
    let releaseLock: (() => void) | undefined;
    let projectWorkspacePath: string;

    try {
      const workspace = await this.workspaceManager.getProjectWorkspace(input.projectId);
      projectWorkspacePath = workspace.workspacePath;
      releaseLock = await this.workspaceManager.acquireWriteLock(input.projectId, 10000);
      recordStep('WORKSPACE_ACQUIRED', `Acquired workspace at '${projectWorkspacePath}'`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.executionStatuses.set(input.executionId, ExecutionStatus.FAILED);
      recordStep('WORKSPACE_ERROR', `Failed acquiring workspace lock: ${errorMsg}`);
      return {
        executionId: input.executionId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: ExecutionStatus.FAILED,
        error: errorMsg,
        events,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 3. Resolve agent role mapping and permission rules
    const role = (input.context?.role as AgentRole) || AgentRole.DEVELOPER;
    const profile = OpenCodeAgentMapper.getProfile(role);

    try {
      // 4. Create OpenCode Session
      const session = await this.sessionManager.startSession({
        projectId: input.projectId,
        taskId: input.taskId,
        agentId: input.agentId,
        title: `CrewFlow: ${input.title}`,
        permissionRules: profile.permissionRules,
      });

      this.executionToSessionMap.set(input.executionId, session.sessionId);
      recordStep('SESSION_CREATED', `OpenCode session '${session.sessionId}' started for role '${role}'`);

      // 5. Build execution prompt with task details, requirements, and injected memory context
      const memoryContext = (input.context?.memoryContext as Record<string, unknown>) || {};
      const promptText = this.buildPrompt(input, memoryContext, projectWorkspacePath);

      // 6. Submit task message to OpenCode session
      recordStep('PROMPT_DISPATCHED', `Dispatched instructions to OpenCode agent`);
      const messageResponse = await this.sessionManager.submitMessage(
        session.sessionId,
        promptText,
        profile.systemPrompt,
        profile.allowedTools,
      );

      recordStep('EXECUTION_PROGRESS', 'OpenCode agent executed step operations');

      // 7. Collect session git diff and verify outcomes
      const diffResponse = await this.sessionManager.getDiffEvidence(session.sessionId).catch(() => undefined);
      const evidence = await ResultVerifier.verify({ diffResponse });

      recordStep('RESULT_VERIFIED', `Evidence verification: ${evidence.verified ? 'PASSED' : 'UNVERIFIED'}`, {
        filesModified: evidence.filesModified,
        verified: evidence.verified,
      });

      // 8. Clean up session
      await this.sessionManager.closeSession(session.sessionId).catch(() => {});
      this.executionToSessionMap.delete(input.executionId);

      const finalStatus = evidence.verified ? ExecutionStatus.SUCCEEDED : ExecutionStatus.FAILED;
      this.executionStatuses.set(input.executionId, finalStatus);

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTimeMs;

      return {
        executionId: input.executionId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: finalStatus,
        output: {
          evidence,
          response: messageResponse ?? {},
          summary: `OpenCode completed execution on task '${input.title}' (${evidence.filesModified.length} files modified)`,
        },
        events,
        startedAt,
        completedAt,
        durationMs,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.executionStatuses.set(input.executionId, ExecutionStatus.FAILED);
      recordStep('EXECUTION_FAILED', `Execution failed: ${errorMsg}`);

      return {
        executionId: input.executionId,
        taskId: input.taskId,
        agentId: input.agentId,
        status: ExecutionStatus.FAILED,
        error: errorMsg,
        events,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } finally {
      if (releaseLock) {
        releaseLock();
      }
    }
  }

  /**
   * Cancels an in-flight execution.
   */
  async cancel(executionId: string): Promise<void> {
    const sessionId = this.executionToSessionMap.get(executionId);
    if (sessionId) {
      await this.sessionManager.abortSession(sessionId);
      await this.sessionManager.closeSession(sessionId);
      this.executionToSessionMap.delete(executionId);
    }
    this.executionStatuses.set(executionId, ExecutionStatus.CANCELLED);
  }

  /**
   * Gets current execution status.
   */
  async getStatus(executionId: string): Promise<ExecutionStatus> {
    return this.executionStatuses.get(executionId) ?? ExecutionStatus.QUEUED;
  }

  /**
   * Constructs the prompt delivered to OpenCode including injected Phase 6 memory context.
   */
  private buildPrompt(
    input: AgentExecutionInput,
    memoryContext: Record<string, unknown>,
    workspacePath: string,
  ): string {
    const parts: string[] = [
      `# Task: ${input.title}`,
      `Description: ${input.description}`,
      `Workspace Directory: ${workspacePath}`,
      `Required Capabilities: ${input.requiredCapabilities.join(', ')}`,
    ];

    if (memoryContext && Object.keys(memoryContext).length > 0) {
      parts.push('\n## Shared Intelligence Context:');
      if (memoryContext.projectSummary) {
        parts.push(`Project Summary: ${memoryContext.projectSummary}`);
      }
      if (Array.isArray(memoryContext.decisions) && memoryContext.decisions.length > 0) {
        parts.push(`Active Decisions:\n- ${(memoryContext.decisions as string[]).join('\n- ')}`);
      }
      if (Array.isArray(memoryContext.technicalKnowledge) && memoryContext.technicalKnowledge.length > 0) {
        parts.push(`Technical Knowledge:\n- ${(memoryContext.technicalKnowledge as string[]).join('\n- ')}`);
      }
      if (Array.isArray(memoryContext.lessonsLearned) && memoryContext.lessonsLearned.length > 0) {
        parts.push(`Lessons Learned:\n- ${(memoryContext.lessonsLearned as string[]).join('\n- ')}`);
      }
    }

    parts.push('\nPlease execute this task adhering strictly to the provided workspace bounds and safety policies.');
    return parts.join('\n');
  }
}
