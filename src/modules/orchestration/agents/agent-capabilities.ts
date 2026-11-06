import { AgentRole } from '../../../database/types.js';

export const ROLE_CAPABILITIES: Record<AgentRole, readonly string[]> = {
  [AgentRole.DEVELOPER]: [
    'backend_development',
    'frontend_development',
    'database_design',
    'debugging',
    'code_implementation',
    'code_refactoring',
  ],
  [AgentRole.QA]: [
    'unit_testing',
    'integration_testing',
    'test_analysis',
    'regression_testing',
    'performance_testing',
    'debugging',
  ],
  [AgentRole.REVIEWER]: [
    'code_review',
    'security_review',
    'quality_assessment',
  ],
  [AgentRole.COORDINATOR]: [
    'task_planning',
    'dependency_analysis',
    'agent_assignment',
    'system_architecture',
    'interface_design',
  ],
};

export class CapabilityRegistry {
  /**
   * Retrieves the baseline capabilities associated with a standard role.
   */
  static getDefaultCapabilities(role: AgentRole): string[] {
    return [...(ROLE_CAPABILITIES[role] || [])];
  }

  /**
   * Safely normalizes agent capabilities from database JSON into a lowercase string array.
   */
  static normalizeCapabilities(raw: unknown, role?: AgentRole): string[] {
    const list: string[] = [];

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === 'string' && item.trim()) {
          list.push(item.trim().toLowerCase());
        }
      }
    }

    // If no custom capabilities defined, seed with role defaults
    if (list.length === 0 && role) {
      list.push(...this.getDefaultCapabilities(role));
    }

    return [...new Set(list)];
  }

  /**
   * Compares an agent's capabilities against a task's required capabilities.
   * Returns matched, missing, and match percentage (0-100).
   */
  static evaluateMatch(
    agentCapabilities: string[],
    requiredCapabilities: string[],
  ): {
    matched: string[];
    missing: string[];
    matchPercentage: number;
  } {
    if (requiredCapabilities.length === 0) {
      return { matched: [], missing: [], matchPercentage: 100 };
    }

    const agentSet = new Set(agentCapabilities.map(c => c.toLowerCase()));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of requiredCapabilities) {
      const lower = req.toLowerCase();
      if (agentSet.has(lower)) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const matchPercentage = Math.round((matched.length / requiredCapabilities.length) * 100);

    return { matched, missing, matchPercentage };
  }
}

