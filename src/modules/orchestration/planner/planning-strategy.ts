import crypto from 'node:crypto';
import { AgentRole, TaskPriority } from '../../../database/types.js';
import type { PlannedTaskDefinition, StructuredExecutionPlan } from '../core/orchestration.types.js';
import type { PlanningInput, PlanningResult } from './planner.interface.js';
import { structuredExecutionPlanSchema } from './planner.schemas.js';

export class BaselinePlanningStrategy {
  /**
   * Evaluates if the incoming human objective is too ambiguous or underspecified.
   */
  public analyzeAmbiguity(objective: string): { isAmbiguous: boolean; reasons: string[] } {
    const trimmed = objective.trim();
    const reasons: string[] = [];

    if (trimmed.length < 10) {
      reasons.push('Objective description is too brief (minimum 10 characters required)');
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      reasons.push('Objective must contain at least 3 descriptive words defining the goal');
    }

    // Common vague non-actionable prompts
    const vaguePatterns = [
      /^(do it|fix it|make it work|please help|test|run|start|go|hello|hi|hey|do something)$/i,
      /^[?!.,\s]+$/,
    ];

    if (vaguePatterns.some(pattern => pattern.test(trimmed))) {
      reasons.push('Objective contains generic or non-actionable phrasing without specific scope');
    }

    // Check for actionable intent verbs
    const actionVerbs = [
      'build', 'create', 'implement', 'add', 'develop',
      'fix', 'repair', 'resolve', 'patch', 'debug',
      'audit', 'review', 'verify', 'test', 'check', 'inspect',
      'refactor', 'optimize', 'migrate', 'update', 'upgrade',
      'integrate', 'connect', 'setup', 'configure', 'deploy',
    ];

    const lower = trimmed.toLowerCase();
    const hasActionVerb = actionVerbs.some(verb => lower.includes(verb));
    if (!hasActionVerb && words.length < 5) {
      reasons.push('Objective does not clearly identify an actionable engineering verb or task intent');
    }

    return {
      isAmbiguous: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Decomposes the human objective into an actionable, dependency-aware structured execution plan.
   */
  public generatePlan(input: PlanningInput): PlanningResult {
    const ambiguity = this.analyzeAmbiguity(input.objective);
    if (ambiguity.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityReasons: ambiguity.reasons,
        errorMessage: `Request is ambiguous: ${ambiguity.reasons.join('; ')}`,
      };
    }

    const planId = `plan_${crypto.randomUUID().slice(0, 8)}`;
    const lower = input.objective.toLowerCase();

    let tasks: PlannedTaskDefinition[];
    let summary: string;
    let estimatedTotalComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

    if (lower.includes('fix') || lower.includes('bug') || lower.includes('error') || lower.includes('crash')) {
      summary = `Defect remediation workflow for: "${input.objective}"`;
      estimatedTotalComplexity = 'MEDIUM';
      tasks = [
        {
          tempId: 'task_rca',
          title: `Root Cause Analysis: ${input.objective.slice(0, 60)}`,
          description: `Analyze logs, isolate the reproduction steps, and identify the root cause for "${input.objective}".`,
          expectedOutcome: 'Documented root cause report and reliable reproduction test scenario.',
          requiredCapabilities: ['debugging', 'test_analysis'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.HIGH,
          dependencies: [],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Reproduction confirmed', 'Failing test written or root cause isolated'],
        },
        {
          tempId: 'task_patch',
          title: `Apply Code Fix: ${input.objective.slice(0, 60)}`,
          description: `Implement code modification and bugfix addressing the diagnosed root cause.`,
          expectedOutcome: 'Source code patch resolving the defect without regressions.',
          requiredCapabilities: ['backend_development', 'debugging'],
          suggestedRole: AgentRole.DEVELOPER,
          priority: TaskPriority.HIGH,
          dependencies: ['task_rca'],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Code fix committed', 'Unit tests passing cleanly'],
        },
        {
          tempId: 'task_verify',
          title: `Regression & Integration Verification`,
          description: `Execute test suite, verify bug resolution, and assert no adjacent regressions occurred.`,
          expectedOutcome: 'All tests green and confirmation of defect resolution.',
          requiredCapabilities: ['regression_testing', 'integration_testing'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.HIGH,
          dependencies: ['task_patch'],
          estimatedComplexity: 'LOW',
          completionCriteria: ['All regression suites pass', 'Reproduction case confirms fix'],
        },
        {
          tempId: 'task_review',
          title: `Security & Quality Review`,
          description: `Conduct peer code review and security inspection of the bugfix patch.`,
          expectedOutcome: 'Approved code review without outstanding security or style findings.',
          requiredCapabilities: ['code_review', 'security_review'],
          suggestedRole: AgentRole.REVIEWER,
          priority: TaskPriority.MEDIUM,
          dependencies: ['task_verify'],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Review approved', 'No security vulnerabilities identified'],
        },
      ];
    } else if (lower.includes('audit') || lower.includes('review') || lower.includes('security') || lower.includes('inspect')) {
      summary = `Security and quality audit workflow for: "${input.objective}"`;
      estimatedTotalComplexity = 'HIGH';
      tasks = [
        {
          tempId: 'task_audit',
          title: `Static Analysis & Security Inspection`,
          description: `Perform code review, static analysis, and dependency security checks for "${input.objective}".`,
          expectedOutcome: 'Detailed findings matrix categorized by severity and impact.',
          requiredCapabilities: ['security_review', 'code_review'],
          suggestedRole: AgentRole.REVIEWER,
          priority: TaskPriority.HIGH,
          dependencies: [],
          estimatedComplexity: 'HIGH',
          completionCriteria: ['Threat model inspected', 'Vulnerability scan complete'],
        },
        {
          tempId: 'task_coverage',
          title: `Test Coverage & Edge Case Assessment`,
          description: `Evaluate test suites, mutation coverage, and boundary failure modes.`,
          expectedOutcome: 'Quality metric report detailing coverage and untested surfaces.',
          requiredCapabilities: ['test_analysis', 'unit_testing'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.MEDIUM,
          dependencies: ['task_audit'],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Coverage metrics extracted', 'Gaps documented'],
        },
        {
          tempId: 'task_remediation',
          title: `Coordinator Synthesis & Action Plan`,
          description: `Synthesize review audit findings and produce an actionable remediation roadmap.`,
          expectedOutcome: 'Prioritized remediation roadmap with resource allocation.',
          requiredCapabilities: ['task_planning', 'dependency_analysis'],
          suggestedRole: AgentRole.COORDINATOR,
          priority: TaskPriority.MEDIUM,
          dependencies: ['task_coverage'],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Final audit report generated', 'Action items created'],
        },
      ];
    } else if (lower.includes('refactor') || lower.includes('optimize') || lower.includes('migrate')) {
      summary = `Refactoring and optimization pipeline for: "${input.objective}"`;
      estimatedTotalComplexity = 'HIGH';
      tasks = [
        {
          tempId: 'task_benchmark',
          title: `Establish Baseline Performance & Metrics`,
          description: `Benchmark current system performance, throughput, and existing test coverage before changes.`,
          expectedOutcome: 'Baseline telemetry and regression suite ready.',
          requiredCapabilities: ['performance_testing', 'test_analysis'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.MEDIUM,
          dependencies: [],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Baseline measurements documented', 'All baseline tests pass'],
        },
        {
          tempId: 'task_refactor',
          title: `Refactor Architecture & Source Code`,
          description: `Implement structural refactoring, module decoupling, or algorithm optimization.`,
          expectedOutcome: 'Refactored codebase adhering to design patterns and strict type safety.',
          requiredCapabilities: ['backend_development', 'code_refactoring'],
          suggestedRole: AgentRole.DEVELOPER,
          priority: TaskPriority.HIGH,
          dependencies: ['task_benchmark'],
          estimatedComplexity: 'HIGH',
          completionCriteria: ['Refactored components committed', 'Type check passes with zero errors'],
        },
        {
          tempId: 'task_validate',
          title: `Validate Performance Gains & Parity`,
          description: `Run benchmark suite and functional parity tests to ensure no regressions and verify performance.`,
          expectedOutcome: 'Comparative report proving metric improvements and 100% functional parity.',
          requiredCapabilities: ['performance_testing', 'regression_testing'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.HIGH,
          dependencies: ['task_refactor'],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Parity confirmed', 'Performance improvement demonstrated'],
        },
        {
          tempId: 'task_review',
          title: `Architecture & Code Quality Review`,
          description: `Final review of refactored boundaries, maintainability, and clean code principles.`,
          expectedOutcome: 'Approved code review and architecture sign-off.',
          requiredCapabilities: ['code_review', 'quality_assessment'],
          suggestedRole: AgentRole.REVIEWER,
          priority: TaskPriority.MEDIUM,
          dependencies: ['task_validate'],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Architecture compliance verified', 'No outstanding comments'],
        },
      ];
    } else {
      // General feature development decomposition (default baseline)
      summary = `Feature implementation plan for: "${input.objective}"`;
      estimatedTotalComplexity = 'MEDIUM';
      tasks = [
        {
          tempId: 'task_spec',
          title: `Specification & Architecture Design: ${input.objective.slice(0, 50)}`,
          description: `Design technical architecture, interfaces, and boundary contracts for "${input.objective}".`,
          expectedOutcome: 'Structured interface contracts and data models ready for implementation.',
          requiredCapabilities: ['system_architecture', 'interface_design'],
          suggestedRole: AgentRole.COORDINATOR,
          priority: TaskPriority.HIGH,
          dependencies: [],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Interface design defined', 'Model dependencies mapped'],
        },
        {
          tempId: 'task_impl',
          title: `Implement Core Logic: ${input.objective.slice(0, 50)}`,
          description: `Write the business logic, service methods, and repository operations according to specification.`,
          expectedOutcome: 'Fully typed and functional implementation code.',
          requiredCapabilities: ['backend_development', 'code_implementation'],
          suggestedRole: AgentRole.DEVELOPER,
          priority: TaskPriority.HIGH,
          dependencies: ['task_spec'],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Code implemented', 'Compiles cleanly with strict TypeScript'],
        },
        {
          tempId: 'task_qa',
          title: `Automated Testing & Edge Case Verification`,
          description: `Author unit and integration tests covering the happy path, edge cases, and error handling.`,
          expectedOutcome: 'Automated test suite achieving comprehensive coverage.',
          requiredCapabilities: ['unit_testing', 'integration_testing'],
          suggestedRole: AgentRole.QA,
          priority: TaskPriority.HIGH,
          dependencies: ['task_impl'],
          estimatedComplexity: 'MEDIUM',
          completionCriteria: ['Unit tests pass 100%', 'Edge cases validated'],
        },
        {
          tempId: 'task_review',
          title: `Quality Gate & Code Review`,
          description: `Inspect code against security best practices, coding conventions, and architectural rules.`,
          expectedOutcome: 'Code review approval and verified readiness for integration.',
          requiredCapabilities: ['code_review', 'quality_assessment'],
          suggestedRole: AgentRole.REVIEWER,
          priority: TaskPriority.MEDIUM,
          dependencies: ['task_qa'],
          estimatedComplexity: 'LOW',
          completionCriteria: ['Review approved', 'Ready for deployment'],
        },
      ];
    }

    // Build the dependency graph dictionary
    const dependencyGraph: Record<string, string[]> = {};
    for (const t of tasks) {
      dependencyGraph[t.tempId] = t.dependencies;
    }

    const plan: StructuredExecutionPlan = {
      planId,
      objective: input.objective,
      summary,
      tasks,
      dependencyGraph,
      estimatedTotalComplexity,
      createdAt: new Date().toISOString(),
    };

    // Validate the plan against the schema
    const validatedPlan = structuredExecutionPlanSchema.parse(plan);

    return {
      success: true,
      plan: validatedPlan as StructuredExecutionPlan,
    };
  }
}

