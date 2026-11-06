import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { TaskStatus } from '../../../database/types.js';
import type { AgentCandidate } from './agent.types.js';
import { CapabilityRegistry } from './agent-capabilities.js';

export interface AgentRegistryOptions {
  prismaClient?: PrismaClient;
}

export class AgentRegistry {
  private readonly prisma: PrismaClient;

  constructor(options: AgentRegistryOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Discovers all agents associated with a project and computes their active workloads.
   * Does not fabricate fake agents.
   */
  async getProjectAgents(projectId: string): Promise<AgentCandidate[]> {
    const agents = await this.prisma.agent.findMany({
      where: { projectId },
      include: {
        assignedTasks: {
          where: {
            status: {
              in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW],
            },
          },
          select: { id: true },
        },
      },
    });

    return agents.map(agent => ({
      id: agent.id,
      projectId: agent.projectId,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      capabilities: CapabilityRegistry.normalizeCapabilities(agent.capabilities, agent.role),
      configuration: (agent.configuration as Record<string, unknown>) || {},
      activeWorkload: agent.assignedTasks.length,
    }));
  }

  /**
   * Retrieves a single agent by ID.
   */
  async getAgentById(agentId: string): Promise<AgentCandidate | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        assignedTasks: {
          where: {
            status: {
              in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW],
            },
          },
          select: { id: true },
        },
      },
    });

    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      projectId: agent.projectId,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      capabilities: CapabilityRegistry.normalizeCapabilities(agent.capabilities, agent.role),
      configuration: (agent.configuration as Record<string, unknown>) || {},
      activeWorkload: agent.assignedTasks.length,
    };
  }
}
