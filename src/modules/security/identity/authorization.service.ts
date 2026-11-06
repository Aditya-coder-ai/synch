import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { WorkspaceRole } from '../../../database/types.js';
import { UnauthorizedReviewerError, SelfApprovalProhibitedError } from '../security.errors.js';

export interface AuthorizationServiceOptions {
  prismaClient?: PrismaClient;
}

const ROLE_HIERARCHY: Record<string, number> = {
  [WorkspaceRole.MEMBER]: 1,
  [WorkspaceRole.ADMIN]: 2,
  [WorkspaceRole.OWNER]: 3,
};

export class AuthorizationService {
  private readonly prisma: PrismaClient;

  constructor(options: AuthorizationServiceOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
  }

  /**
   * Asserts that a user has membership and sufficient role within the workspace for a project.
   */
  async assertProjectAuthority(
    userId: string,
    projectId: string,
    minimumRole: string = WorkspaceRole.MEMBER,
  ): Promise<{ workspaceId: string; userRole: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        workspace: {
          select: {
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new UnauthorizedReviewerError(userId, `Project '${projectId}' does not exist.`);
    }

    const membership = project.workspace.members[0];
    if (!membership) {
      throw new UnauthorizedReviewerError(
        userId,
        `User is not a member of the workspace for project '${projectId}'.`,
      );
    }

    const userLevel = ROLE_HIERARCHY[membership.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 1;

    if (userLevel < requiredLevel) {
      throw new UnauthorizedReviewerError(
        userId,
        `Insufficient role '${membership.role}'. Minimum required role is '${minimumRole}'.`,
      );
    }

    return {
      workspaceId: project.workspaceId,
      userRole: membership.role,
    };
  }

  /**
   * Enforces separation of duties: prevents an author/requester from self-approving their own critical actions.
   */
  assertSeparationOfDuties(params: {
    reviewerUserId: string;
    requesterUserId?: string | null;
    actionType: string;
    riskLevel?: string;
  }): void {
    if (params.requesterUserId && params.reviewerUserId === params.requesterUserId) {
      throw new SelfApprovalProhibitedError(params.reviewerUserId, params.actionType);
    }
  }
}

