import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import type { SwitchService } from '../../switch/switch.service.js';
import type { ApprovalModel } from '../../../database/types.js';

export interface ApprovalNotifierOptions {
  prismaClient?: PrismaClient;
  switchService?: SwitchService;
}

export class ApprovalNotifier {
  private readonly prisma: PrismaClient;
  private readonly switchService?: SwitchService;

  constructor(options: ApprovalNotifierOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.switchService = options.switchService;
  }

  /**
   * Dispatches a structured notification message to the project's Switch room.
   */
  private async notifyRoom(projectId: string, content: string): Promise<void> {
    if (!this.switchService) {
      return;
    }

    try {
      // Find active conversation for project
      const conversation = await this.prisma.conversation.findFirst({
        where: { projectId, externalRoomId: { not: null } },
        select: { externalRoomId: true },
      });

      if (conversation?.externalRoomId) {
        await this.switchService.sendMessage({
          roomId: conversation.externalRoomId,
          content,
        });
      }
    } catch {
      // Notification dispatch failure should not block security state transitions
    }
  }

  async notifyApprovalRequested(approval: ApprovalModel): Promise<void> {
    const expiresText = approval.expiresAt
      ? `\n**Expires**: ${approval.expiresAt.toISOString()}`
      : '';

    const content = [
      '🚨 **APPROVAL REQUIRED**',
      `**Approval ID**: \`${approval.id}\``,
      `**Action**: ${approval.actionType} (${approval.actionCategory})`,
      `**Risk Level**: **${approval.riskLevel}**`,
      approval.requestedByAgentId ? `**Requested By**: Agent \`${approval.requestedByAgentId}\`` : '',
      `**Reason**: ${approval.description}`,
      `**Status**: Pending human review${expiresText}`,
      '',
      '> *Note: Approval must be submitted via the authenticated CrewFlow API or dashboard.*',
    ]
      .filter(line => line !== '')
      .join('\n');

    await this.notifyRoom(approval.projectId, content);
  }

  async notifyApprovalDecision(
    approval: ApprovalModel,
    decision: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    decisionReason?: string,
  ): Promise<void> {
    const icon = decision === 'APPROVED' ? '✅' : decision === 'REJECTED' ? '❌' : '⚠️';
    const reasonText = decisionReason ? `\n**Reason**: ${decisionReason}` : '';

    const content = [
      `${icon} **APPROVAL ${decision}**`,
      `**Approval ID**: \`${approval.id}\``,
      `**Action**: ${approval.actionType}`,
      `**Reviewed By**: \`${approval.reviewedByUserId ?? 'SYSTEM'}\``,
      reasonText,
      `**Execution State**: ${decision === 'APPROVED' ? 'Authorized to proceed' : 'Blocked'}`,
    ]
      .filter(line => line !== '')
      .join('\n');

    await this.notifyRoom(approval.projectId, content);
  }

  async notifyApprovalExpired(approval: ApprovalModel): Promise<void> {
    const content = [
      '⏰ **APPROVAL EXPIRED**',
      `**Approval ID**: \`${approval.id}\``,
      `**Action**: ${approval.actionType}`,
      `**Status**: Expired without review. Any pending execution is blocked.`,
    ].join('\n');

    await this.notifyRoom(approval.projectId, content);
  }
}

