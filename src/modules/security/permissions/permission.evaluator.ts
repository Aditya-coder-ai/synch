import type { ActionEvaluationContext, EvaluationResult } from '../security.types.js';
import { PolicyEngine } from '../policies/policy.engine.js';

export interface PermissionEvaluatorOptions {
  policyEngine?: PolicyEngine;
}

export class PermissionEvaluator {
  private readonly policyEngine: PolicyEngine;

  constructor(options: PermissionEvaluatorOptions = {}) {
    this.policyEngine = options.policyEngine ?? new PolicyEngine();
  }

  /**
   * Evaluates whether an action requested by an agent or user is permitted.
   */
  public evaluateAction(context: ActionEvaluationContext): EvaluationResult {
    return this.policyEngine.evaluate(context);
  }
}
