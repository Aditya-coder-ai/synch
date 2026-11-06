import {
  type ActionEvaluationContext,
  type EvaluationResult,
  PermissionDecision,
  RiskLevel,
} from '../security.types.js';
import { computeActionDigest } from '../approvals/approval.digest.js';
import { PermissionRegistry } from '../permissions/permission.registry.js';
import {
  type SecurityPolicyConfig,
  type SecurityPolicyRule,
  DEFAULT_SECURITY_POLICY_CONFIG,
} from './policy.types.js';
import { BUILTIN_SECURITY_POLICIES } from './policy.registry.js';

export class PolicyEngine {
  private readonly rules: SecurityPolicyRule[];
  private readonly config: SecurityPolicyConfig;

  constructor(rules: SecurityPolicyRule[] = BUILTIN_SECURITY_POLICIES, config: Partial<SecurityPolicyConfig> = {}) {
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
    this.config = { ...DEFAULT_SECURITY_POLICY_CONFIG, ...config };
  }

  /**
   * Registers a custom policy rule with priority ordering.
   */
  public registerRule(rule: SecurityPolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluates an action evaluation context against registered policy rules.
   */
  public evaluate(context: ActionEvaluationContext): EvaluationResult {
    const actionDigest = computeActionDigest(context.action);

    // 1. Iterate through prioritized rules
    for (const rule of this.rules) {
      if (rule.applies(context)) {
        const result = rule.evaluate(context);
        if (result && result.decision) {
          return {
            decision: result.decision,
            policyId: rule.id,
            riskLevel: result.riskLevel ?? RiskLevel.L2,
            reason: result.reason ?? rule.description,
            requiresApproval: result.decision === PermissionDecision.APPROVAL_REQUIRED,
            requiredRole: result.requiredRole,
            actionDigest,
            metadata: {
              ruleName: rule.name,
              evaluatedAt: new Date().toISOString(),
            },
          };
        }
      }
    }

    // 2. Fall back to PermissionRegistry dynamic classification
    const classification = PermissionRegistry.classifyAction({
      category: context.action.category,
      type: context.action.type,
      target: context.action.target,
      command: context.action.command,
    });

    if (classification.requiresApproval) {
      return {
        decision: PermissionDecision.APPROVAL_REQUIRED,
        policyId: 'DEFAULT_CLASSIFIER_GATE',
        riskLevel: classification.riskLevel,
        reason: classification.reason,
        requiresApproval: true,
        actionDigest,
      };
    }

    // 3. If unclassified and default-deny is enabled
    if (this.config.defaultDenyUnclassified) {
      return {
        decision: PermissionDecision.DENIED,
        policyId: 'DEFAULT_DENY_UNCLASSIFIED',
        riskLevel: RiskLevel.L4,
        reason: `Operation category '${context.action.category}' has no explicit allow rule and is denied by default.`,
        requiresApproval: false,
        actionDigest,
      };
    }

    return {
      decision: PermissionDecision.ALLOWED,
      policyId: 'DEFAULT_PERMIT',
      riskLevel: RiskLevel.L1,
      reason: 'Permitted by default fallback policy.',
      requiresApproval: false,
      actionDigest,
    };
  }
}

