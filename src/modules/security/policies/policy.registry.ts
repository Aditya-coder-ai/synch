import { ActionCategory, RiskLevel, PermissionDecision } from '../security.types.js';
import type { SecurityPolicyRule } from './policy.types.js';

export const BUILTIN_SECURITY_POLICIES: SecurityPolicyRule[] = [
  // Rule 1: Workspace Path Traversal Guard (Priority 10)
  {
    id: 'SEC-POL-001',
    name: 'Workspace Containment & Path Traversal Guard',
    description: 'Enforces that all file operations remain strictly inside the authorized workspace boundary.',
    priority: 10,
    applies: ctx => {
      const target = ctx.action.target || '';
      return target.includes('..') || target.includes('\0');
    },
    evaluate: ctx => ({
      decision: PermissionDecision.DENIED,
      riskLevel: RiskLevel.L4,
      reason: `Path traversal or null-byte detected in target '${ctx.action.target}'. Immediate denial.`,
      requiresApproval: false,
    }),
  },

  // Rule 2: Secret & Environment Protection (Priority 20)
  {
    id: 'SEC-POL-002',
    name: 'Environment and Secret Protection Policy',
    description: 'Denies direct modification or creation of secret credentials and environment files without approval.',
    priority: 20,
    applies: ctx => {
      const target = (ctx.action.target || '').toLowerCase();
      const isSensitive =
        target.includes('.env') ||
        target.includes('credentials') ||
        target.includes('id_rsa') ||
        target.includes('secret');
      return (
        isSensitive &&
        (ctx.action.category === ActionCategory.FILE_CREATE ||
          ctx.action.category === ActionCategory.FILE_MODIFY ||
          ctx.action.category === ActionCategory.FILE_DELETE ||
          ctx.action.category === ActionCategory.ENVIRONMENT_MODIFY)
      );
    },
    evaluate: ctx => ({
      decision: PermissionDecision.APPROVAL_REQUIRED,
      riskLevel: RiskLevel.L4,
      reason: `Action '${ctx.action.type}' modifies protected secrets or environment file '${ctx.action.target}'. Human approval required.`,
      requiresApproval: true,
      requiredRole: 'OWNER',
    }),
  },

  // Rule 3: Destructive Command Policy (Priority 30)
  {
    id: 'SEC-POL-003',
    name: 'Destructive Shell Command Guard',
    description: 'Intercepts system-impacting commands (rm -rf, mkfs, dd, fork bomb) and requires human authorization.',
    priority: 30,
    applies: ctx => {
      const cmd = (ctx.action.command || ctx.action.target || ctx.action.type || '').toLowerCase();
      return /rm\s+-rf\s+(?:\/|\.\.|\*)|mkfs|dd\s+if=|drop\s+database/i.test(cmd);
    },
    evaluate: () => ({
      decision: PermissionDecision.APPROVAL_REQUIRED,
      riskLevel: RiskLevel.L4,
      reason: `Destructive command detected. Requires human authorization before execution.`,
      requiresApproval: true,
      requiredRole: 'ADMIN',
    }),
  },

  // Rule 4: Production Deployment Policy (Priority 40)
  {
    id: 'SEC-POL-004',
    name: 'Production & Staging Deployment Gate',
    description: 'Enforces human sign-off on cloud deployments and package publications.',
    priority: 40,
    applies: ctx =>
      ctx.action.category === ActionCategory.DEPLOYMENT ||
      /npm\s+publish|pnpm\s+publish|kubectl\s+apply|docker\s+push/i.test(
        ctx.action.command || ctx.action.type || '',
      ),
    evaluate: () => ({
      decision: PermissionDecision.APPROVAL_REQUIRED,
      riskLevel: RiskLevel.L4,
      reason: 'Deployment or public release requires authorized human review.',
      requiresApproval: true,
      requiredRole: 'ADMIN',
    }),
  },

  // Rule 5: Remote Git Push Policy (Priority 50)
  {
    id: 'SEC-POL-005',
    name: 'Remote Git Push Gate',
    description: 'Requires human approval before pushing code to remote origin/upstream branches.',
    priority: 50,
    applies: ctx =>
      ctx.action.category === ActionCategory.GIT_PUSH ||
      /git\s+push/i.test(ctx.action.command || ctx.action.type || ''),
    evaluate: () => ({
      decision: PermissionDecision.APPROVAL_REQUIRED,
      riskLevel: RiskLevel.L3,
      reason: 'Pushing changes to remote git repository requires human approval.',
      requiresApproval: true,
      requiredRole: 'MEMBER',
    }),
  },

  // Rule 6: Database Migration Gate (Priority 60)
  {
    id: 'SEC-POL-006',
    name: 'Database Migration Gate',
    description: 'Requires human sign-off on database schema modifications.',
    priority: 60,
    applies: ctx => ctx.action.category === ActionCategory.DATABASE_MIGRATION,
    evaluate: ctx => {
      const cmd = (ctx.action.command || ctx.action.type || '').toLowerCase();
      const isDestructive = /drop|truncate/i.test(cmd);
      return {
        decision: PermissionDecision.APPROVAL_REQUIRED,
        riskLevel: isDestructive ? RiskLevel.L4 : RiskLevel.L3,
        reason: isDestructive
          ? 'Destructive database migration requires senior human approval.'
          : 'Database migration requires human approval.',
        requiresApproval: true,
        requiredRole: isDestructive ? 'OWNER' : 'ADMIN',
      };
    },
  },

  // Rule 7: Safe Standard Development Operations (Priority 100)
  {
    id: 'SEC-POL-100',
    name: 'Standard Development Operations Permitted',
    description: 'Permits non-sensitive file reads, writes, commits, and test executions within the project workspace.',
    priority: 100,
    applies: ctx => {
      const cat = ctx.action.category;
      return (
        cat === ActionCategory.FILE_READ ||
        cat === ActionCategory.FILE_CREATE ||
        cat === ActionCategory.FILE_MODIFY ||
        cat === ActionCategory.TEST_EXECUTE ||
        cat === ActionCategory.GIT_COMMIT ||
        cat === ActionCategory.DATABASE_READ
      );
    },
    evaluate: ctx => ({
      decision: PermissionDecision.ALLOWED,
      riskLevel:
        ctx.action.category === ActionCategory.FILE_READ ||
        ctx.action.category === ActionCategory.TEST_EXECUTE ||
        ctx.action.category === ActionCategory.DATABASE_READ
          ? RiskLevel.L0
          : RiskLevel.L1,
      reason: 'Standard workspace development operation permitted by policy.',
      requiresApproval: false,
    }),
  },
];
