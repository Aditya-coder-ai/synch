import type { ActionEvaluationContext, EvaluationResult } from '../security.types.js';

export interface SecurityPolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Lower numbers evaluate first
  applies: (context: ActionEvaluationContext) => boolean;
  evaluate: (context: ActionEvaluationContext) => Partial<EvaluationResult> | null;
}

export interface SecurityPolicyConfig {
  defaultDenyUnclassified: boolean;
  enforceSeparationOfDuties: boolean;
  allowSelfApprovalForL1: boolean;
  defaultApprovalTimeoutSeconds: number;
}

export const DEFAULT_SECURITY_POLICY_CONFIG: SecurityPolicyConfig = {
  defaultDenyUnclassified: true,
  enforceSeparationOfDuties: true,
  allowSelfApprovalForL1: false,
  defaultApprovalTimeoutSeconds: 86400, // 24 hours
};
