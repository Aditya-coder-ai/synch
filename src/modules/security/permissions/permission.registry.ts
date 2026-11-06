import { ActionCategory, RiskLevel } from '../security.types.js';

export interface ActionMetadata {
  category: ActionCategory;
  defaultRiskLevel: RiskLevel;
  description: string;
  requiresHumanApprovalByDefault: boolean;
}

export const ACTION_REGISTRY: Record<ActionCategory, ActionMetadata> = {
  [ActionCategory.FILE_READ]: {
    category: ActionCategory.FILE_READ,
    defaultRiskLevel: RiskLevel.L0,
    description: 'Read contents of workspace files',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.FILE_CREATE]: {
    category: ActionCategory.FILE_CREATE,
    defaultRiskLevel: RiskLevel.L1,
    description: 'Create new files in project workspace',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.FILE_MODIFY]: {
    category: ActionCategory.FILE_MODIFY,
    defaultRiskLevel: RiskLevel.L1,
    description: 'Modify existing files in project workspace',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.FILE_DELETE]: {
    category: ActionCategory.FILE_DELETE,
    defaultRiskLevel: RiskLevel.L3,
    description: 'Delete files or directories',
    requiresHumanApprovalByDefault: true,
  },
  [ActionCategory.COMMAND_EXECUTE]: {
    category: ActionCategory.COMMAND_EXECUTE,
    defaultRiskLevel: RiskLevel.L2,
    description: 'Execute shell commands or scripts',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.TEST_EXECUTE]: {
    category: ActionCategory.TEST_EXECUTE,
    defaultRiskLevel: RiskLevel.L0,
    description: 'Execute automated tests and assertions',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.DATABASE_READ]: {
    category: ActionCategory.DATABASE_READ,
    defaultRiskLevel: RiskLevel.L0,
    description: 'Read database records or execute read queries',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.DATABASE_WRITE]: {
    category: ActionCategory.DATABASE_WRITE,
    defaultRiskLevel: RiskLevel.L2,
    description: 'Insert, update, or delete application database records',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.DATABASE_MIGRATION]: {
    category: ActionCategory.DATABASE_MIGRATION,
    defaultRiskLevel: RiskLevel.L3,
    description: 'Execute database schema changes and migrations',
    requiresHumanApprovalByDefault: true,
  },
  [ActionCategory.ENVIRONMENT_MODIFY]: {
    category: ActionCategory.ENVIRONMENT_MODIFY,
    defaultRiskLevel: RiskLevel.L4,
    description: 'Modify environment variables, secret files, or credentials',
    requiresHumanApprovalByDefault: true,
  },
  [ActionCategory.NETWORK_ACCESS]: {
    category: ActionCategory.NETWORK_ACCESS,
    defaultRiskLevel: RiskLevel.L2,
    description: 'Outbound HTTP/HTTPS or socket network requests',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.GIT_COMMIT]: {
    category: ActionCategory.GIT_COMMIT,
    defaultRiskLevel: RiskLevel.L1,
    description: 'Commit code changes locally to git repository',
    requiresHumanApprovalByDefault: false,
  },
  [ActionCategory.GIT_PUSH]: {
    category: ActionCategory.GIT_PUSH,
    defaultRiskLevel: RiskLevel.L3,
    description: 'Push git commits to remote repository',
    requiresHumanApprovalByDefault: true,
  },
  [ActionCategory.DEPLOYMENT]: {
    category: ActionCategory.DEPLOYMENT,
    defaultRiskLevel: RiskLevel.L4,
    description: 'Deploy code, containers, or infrastructure to production/staging',
    requiresHumanApprovalByDefault: true,
  },
  [ActionCategory.EXTERNAL_SERVICE_ACTION]: {
    category: ActionCategory.EXTERNAL_SERVICE_ACTION,
    defaultRiskLevel: RiskLevel.L3,
    description: 'Trigger external SaaS or third-party webhooks/APIs',
    requiresHumanApprovalByDefault: true,
  },
};

const SENSITIVE_FILE_PATTERNS = [
  /\.env(?:\..+)?$/i,
  /credentials(?:\.json)?$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pem$/i,
  /\.key$/i,
  /service-account.*\.json$/i,
  /secrets?\./i,
];

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /rm\s+-rf\s+(?:\/|\.\.|\*)/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:(){ :|:& };:/, // Fork bomb
  /chmod\s+-R\s+777/i,
  /drop\s+database/i,
  /truncate\s+table/i,
];

const ELEVATED_PUBLISH_PATTERNS = [
  /npm\s+publish/i,
  /yarn\s+publish/i,
  /pnpm\s+publish/i,
  /git\s+push/i,
  /docker\s+push/i,
  /kubectl\s+apply/i,
  /terraform\s+apply/i,
];

export class PermissionRegistry {
  /**
   * Dynamically classifies an action and determines its calibrated risk level.
   */
  public static classifyAction(action: {
    category: ActionCategory;
    type: string;
    target?: string;
    command?: string;
  }): {
    calibratedCategory: ActionCategory;
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    reason: string;
  } {
    const base = ACTION_REGISTRY[action.category] || {
      category: action.category,
      defaultRiskLevel: RiskLevel.L4,
      description: 'Unregistered or unknown action category',
      requiresHumanApprovalByDefault: true,
    };

    const targetStr = (action.target || '').toLowerCase();
    const commandStr = (action.command || action.type || '').toLowerCase();

    // 1. Check for sensitive files (.env, keys, credentials)
    for (const pattern of SENSITIVE_FILE_PATTERNS) {
      if (pattern.test(targetStr) || pattern.test(commandStr)) {
        return {
          calibratedCategory: ActionCategory.ENVIRONMENT_MODIFY,
          riskLevel: RiskLevel.L4,
          requiresApproval: true,
          reason: `Action targets sensitive environment or secret file '${action.target || commandStr}'. Human approval strictly required.`,
        };
      }
    }

    // 2. Check for destructive commands
    for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(commandStr)) {
        return {
          calibratedCategory: ActionCategory.COMMAND_EXECUTE,
          riskLevel: RiskLevel.L4,
          requiresApproval: true,
          reason: `Command '${commandStr}' contains destructive or system-impacting patterns. Human authorization required.`,
        };
      }
    }

    // 3. Check for external deployment / publish / git push
    for (const pattern of ELEVATED_PUBLISH_PATTERNS) {
      if (pattern.test(commandStr)) {
        const isGitPush = /git\s+push/i.test(commandStr);
        return {
          calibratedCategory: isGitPush ? ActionCategory.GIT_PUSH : ActionCategory.DEPLOYMENT,
          riskLevel: isGitPush ? RiskLevel.L3 : RiskLevel.L4,
          requiresApproval: true,
          reason: `Command '${commandStr}' triggers remote publish, push, or deployment. Human authorization required.`,
        };
      }
    }

    // 4. Check for database migrations
    if (action.category === ActionCategory.DATABASE_MIGRATION) {
      const isDestructive = /drop|truncate|alter.*drop/i.test(commandStr);
      return {
        calibratedCategory: ActionCategory.DATABASE_MIGRATION,
        riskLevel: isDestructive ? RiskLevel.L4 : RiskLevel.L3,
        requiresApproval: true,
        reason: isDestructive
          ? `Destructive database migration requires senior human approval.`
          : `Database schema migration requires human approval before execution.`,
      };
    }

    // 5. Default mapping
    return {
      calibratedCategory: base.category,
      riskLevel: base.defaultRiskLevel,
      requiresApproval: base.requiresHumanApprovalByDefault,
      reason: base.description,
    };
  }
}
