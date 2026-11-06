import crypto from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { OrchestrationStatus, TaskStatus } from '../../../database/types.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { AgentSelector } from '../agents/agent-selector.js';
import { OrchestrationEventType } from '../events/orchestration-events.js';
import { OrchestrationEventHandler } from '../events/orchestration-event-handler.js';
import { ExecutionDispatcher } from '../execution/execution-dispatcher.js';
import { ExecutionManager } from '../execution/execution-manager.js';
import { MockAgentExecutionProvider } from '../execution/mock-execution-provider.js';
import type { AgentExecutionProvider } from '../execution/execution.interface.js';
import { PlannerService } from '../planner/planner.service.js';
import { DEFAULT_ORCHESTRATION_POLICY, type OrchestrationPolicy } from '../policies/orchestration-policy.js';
import { DependencyGraph } from '../scheduler/dependency-graph.js';
import { TaskScheduler } from '../scheduler/task-scheduler.js';
import { OrchestrationStateService } from '../state/orchestration-state.js';
import {
  AgentSelectionError,
  OrchestrationError,
} from './orchestration.errors.js';
import type {
  AgentAssignmentResult,
  OrchestrationExecutionSummary,
  OrchestrationRequestInput,
  StructuredExecutionPlan,
  TaskSchedulingResult,
} from './orchestration.types.js';

export interface OrchestratorOptions {
  prismaClient?: PrismaClient;
  plannerService?: PlannerService;
  agentRegistry?: AgentRegistry;
  agentSelector?: AgentSelector;
  executionProvider?: AgentExecutionProvider;
  eventHandler?: OrchestrationEventHandler;
  stateService?: OrchestrationStateService;
  policy?: Partial<OrchestrationPolicy>;
}

export class Orchestrator {
  private readonly prisma: PrismaClient;
  private readonly planner: PlannerService;
  private readonly agentRegistry: AgentRegistry;
  private readonly agentSelector: AgentSelector;
  private readonly executionProvider: AgentExecutionProvider;
  private readonly eventHandler: OrchestrationEventHandler;
  private readonly stateService: OrchestrationStateService;
  private readonly policy: OrchestrationPolicy;

  constructor(options: OrchestratorOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.planner = options.plannerService ?? new PlannerService();
    this.agentRegistry = options.agentRegistry ?? new AgentRegistry({ prismaClient: this.prisma });
    this.agentSelector = options.agentSelector ?? new AgentSelector();
    this.executionProvider = options.executionProvider ?? new MockAgentExecutionProvider();
    this.eventHandler =
      options.eventHandler ?? new OrchestrationEventHandler({ prismaClient: this.prisma });
    this.stateService =
      options.stateService ?? new OrchestrationStateService({ prismaClient: this.prisma });
    this.policy = { ...DEFAULT_ORCHESTRATION_POLICY, ...options.policy };
  }

  /**
   * Main entry point: transforms a human request into a planned, assigned, scheduled, and executed workflow.
   */
  async orchestrate(input: OrchestrationRequestInput): Promise<OrchestrationExecutionSummary> {
    const startTime = Date.now();
    const orchestrationId = `orch_${crypto.randomUUID().slice(0, 10)}`;

    // 1. Verify Project Context
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) {
      throw new OrchestrationError(`Project '${input.projectId}' not found`, 404);
    }

    // 2. Initialize Orchestration Record in database
    await this.prisma.orchestration.create({
      data: {
        id: orchestrationId,
        projectId: input.projectId,
        initiatorUserId: input.initiatorUserId || null,
        conversationId: input.conversationId || null,
        status: OrchestrationStatus.CREATED,
        objective: input.objective,
        context: (input.context as unknown as Prisma.InputJsonValue) ?? {},
      },
    });

    await this.eventHandler.handleEvent({
      orchestrationId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      eventType: OrchestrationEventType.REQUEST_ACCEPTED,
      message: `Orchestration request accepted for objective: "${input.objective}"`,
    });

    // 3. Transition to PLANNING
    await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.PLANNING);
    await this.eventHandler.handleEvent({
      orchestrationId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      eventType: OrchestrationEventType.PLANNING_STARTED,
      message: 'Coordinator analyzing task requirements and generating execution plan',
    });

    // 4. Generate structured execution plan
    let planResult;
    try {
      planResult = await this.planner.plan({
        objective: input.objective,
        projectId: input.projectId,
        context: input.context,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Planning failed';
      await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.FAILED, errorMsg);
      await this.eventHandler.handleEvent({
        orchestrationId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        eventType: OrchestrationEventType.ORCHESTRATION_FAILED,
        message: `Planning failed: ${errorMsg}`,
      });
      throw err;
    }

    const plan = planResult.plan as StructuredExecutionPlan;

    // 5. Discover project agents
    const availableAgents = await this.agentRegistry.getProjectAgents(input.projectId);

    // 6. Select and assign agents for each planned task
    const assignments: AgentAssignmentResult[] = [];
    const tempToAgentMap = new Map<string, { agentId: string; name: string; role: any }>();

    for (const task of plan.tasks) {
      const selection = this.agentSelector.selectAgent(availableAgents, {
        projectId: input.projectId,
        requiredCapabilities: task.requiredCapabilities,
        preferredRole: task.suggestedRole,
        allowBusy: this.policy.allowBusyAgents,
      });

      if (!selection.selectedAgentId) {
        const errorMsg = `No capable agent found for planned task '${task.title}' (${task.suggestedRole}). Requirements: ${task.requiredCapabilities.join(', ')}`;
        if (this.policy.planValidationStrict) {
          await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.FAILED, errorMsg);
          throw new AgentSelectionError(errorMsg, { task, selection });
        }
      } else {
        assignments.push({
          taskId: task.tempId,
          agentId: selection.selectedAgentId,
          agentName: selection.selectedAgentName!,
          role: selection.selectedRole!,
          matchScore: selection.confidenceScore,
          reason: selection.summary,
        });

        tempToAgentMap.set(task.tempId, {
          agentId: selection.selectedAgentId,
          name: selection.selectedAgentName!,
          role: selection.selectedRole!,
        });
      }
    }

    // 7. Persist the plan and tasks in database transaction
    const tempIdToTaskIdMap = new Map<string, string>();
    const persistedTasks = await this.prisma.$transaction(async tx => {
      // Update plan on orchestration session
      await tx.orchestration.update({
        where: { id: orchestrationId },
        data: {
          plan: plan as unknown as object,
          status: OrchestrationStatus.PLAN_READY,
        },
      });

      // Create Task records
      const createdTasks = [];
      for (const t of plan.tasks) {
        const assigned = tempToAgentMap.get(t.tempId);
        const task = await tx.task.create({
          data: {
            projectId: input.projectId,
            orchestrationId,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: TaskStatus.TODO,
            assignedAgentId: assigned?.agentId || null,
          },
        });
        tempIdToTaskIdMap.set(t.tempId, task.id);
        createdTasks.push({
          ...task,
          requiredCapabilities: t.requiredCapabilities,
        });
      }

      // Create TaskDependency records
      for (const t of plan.tasks) {
        const targetTaskId = tempIdToTaskIdMap.get(t.tempId)!;
        for (const depTempId of t.dependencies) {
          const prereqTaskId = tempIdToTaskIdMap.get(depTempId);
          if (prereqTaskId) {
            await tx.taskDependency.create({
              data: {
                taskId: targetTaskId,
                dependsOnTaskId: prereqTaskId,
              },
            });
          }
        }
      }

      return createdTasks;
    });

    await this.eventHandler.handleEvent({
      orchestrationId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      eventType: OrchestrationEventType.PLAN_READY,
      message: `Plan generated with ${plan.tasks.length} tasks. Assignments: ${assignments.map(a => `${a.agentName} (${a.role})`).join(', ')}`,
      payload: { planId: plan.planId, taskCount: plan.tasks.length },
    });

    // 8. Build and validate Dependency Graph
    const graphNodes = persistedTasks.map(pt => {
      const origPlanTask = plan.tasks.find(t => tempIdToTaskIdMap.get(t.tempId) === pt.id)!;
      const mappedDepIds = origPlanTask.dependencies
        .map(depTempId => tempIdToTaskIdMap.get(depTempId))
        .filter((id): id is string => Boolean(id));

      return {
        id: pt.id,
        projectId: pt.projectId,
        title: pt.title,
        priority: pt.priority,
        status: pt.status,
        dependencies: mappedDepIds,
        assignedAgentId: pt.assignedAgentId,
      };
    });

    const graph = new DependencyGraph(graphNodes);
    graph.assertValid();

    // 9. Evaluate initial schedule
    const scheduler = new TaskScheduler(graph);
    let schedulingState = scheduler.evaluate();

    await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.SCHEDULED);
    await this.eventHandler.handleEvent({
      orchestrationId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      eventType: OrchestrationEventType.EXECUTION_SCHEDULED,
      message: `Scheduled ${schedulingState.readyTaskIds.length} initial tasks ready for execution`,
      payload: { readyTaskIds: schedulingState.readyTaskIds },
    });

    // 10. Execute workflow if autoExecute is requested
    if (input.autoExecute) {
      await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.RUNNING);
      await this.eventHandler.handleEvent({
        orchestrationId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        eventType: OrchestrationEventType.EXECUTION_STARTED,
        message: 'Starting task execution loop and agent handoffs',
      });

      const dispatcher = new ExecutionDispatcher({
        prismaClient: this.prisma,
        provider: this.executionProvider,
      });

      const manager = new ExecutionManager({
        prismaClient: this.prisma,
        dispatcher,
      });

      const runResult = await manager.executeAll(persistedTasks, graph);

      // Re-evaluate final schedule state
      schedulingState = scheduler.evaluate();

      if (runResult.failedTaskIds.length > 0) {
        await this.stateService.transitionTo(
          orchestrationId,
          OrchestrationStatus.FAILED,
          `One or more tasks failed during execution: ${runResult.failedTaskIds.join(', ')}`,
        );
        await this.eventHandler.handleEvent({
          orchestrationId,
          projectId: input.projectId,
          conversationId: input.conversationId,
          eventType: OrchestrationEventType.ORCHESTRATION_FAILED,
          message: `Orchestration encountered task failures: ${runResult.failedTaskIds.join(', ')}`,
        });
      } else {
        await this.stateService.transitionTo(orchestrationId, OrchestrationStatus.COMPLETED);
        await this.eventHandler.handleEvent({
          orchestrationId,
          projectId: input.projectId,
          conversationId: input.conversationId,
          eventType: OrchestrationEventType.ORCHESTRATION_COMPLETED,
          message: `All ${runResult.completedTaskIds.length} tasks completed successfully`,
        });
      }
    }

    const finalStatus = await this.stateService.getStatus(orchestrationId);
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const taskSchedulingResult: TaskSchedulingResult = {
      scheduledTaskIds: persistedTasks.map(t => t.id),
      blockedTaskIds: schedulingState.blockedTaskIds,
      completedTaskIds: schedulingState.completedTaskIds,
      failedTaskIds: schedulingState.failedPrerequisiteTaskIds,
      inProgressTaskIds: schedulingState.inProgressTaskIds,
    };

    return {
      orchestrationId,
      projectId: input.projectId,
      status: finalStatus,
      objective: input.objective,
      plan,
      persistedTaskIds: persistedTasks.map(t => t.id),
      assignments,
      scheduling: taskSchedulingResult,
      startedAt: new Date(startTime).toISOString(),
      completedAt,
      durationMs,
    };
  }
}
