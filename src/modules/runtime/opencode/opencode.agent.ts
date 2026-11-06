import { AgentRole } from '../../../database/types.js';
import type { PermissionRule } from './opencode.schemas.js';

export interface OpenCodeAgentProfile {
  role: AgentRole;
  systemPrompt: string;
  allowedTools: Record<string, boolean>;
  permissionRules: PermissionRule[];
}

export class OpenCodeAgentMapper {
  private static readonly PROFILES: Record<AgentRole, OpenCodeAgentProfile> = {
    [AgentRole.COORDINATOR]: {
      role: AgentRole.COORDINATOR,
      systemPrompt: `You are the CrewFlow System Coordinator.
Your responsibility is technical architecture, interface specification, dependency modeling, and cross-agent synthesis.
You do NOT execute destructive shell commands or direct arbitrary database modifications.
Provide clear specifications, design documents, and interface definitions.`,
      allowedTools: {
        read: true,
        write: true,
        edit: true,
        bash: false,
      },
      permissionRules: [
        { permission: 'read', pattern: '*', action: 'allow' },
        { permission: 'edit', pattern: 'docs/*', action: 'allow' },
        { permission: 'edit', pattern: '*.md', action: 'allow' },
        { permission: 'bash', pattern: '*', action: 'deny' },
        { permission: '*', pattern: '*.env*', action: 'deny' },
      ],
    },
    [AgentRole.DEVELOPER]: {
      role: AgentRole.DEVELOPER,
      systemPrompt: `You are the CrewFlow Senior Developer Agent.
Your responsibility is to write clean, strictly-typed, modular, and maintainable implementation code.
Always adhere to existing repository architectural patterns, strict TypeScript conventions, and least privilege.
Never modify environment files containing secrets or run destructive operations.`,
      allowedTools: {
        read: true,
        write: true,
        edit: true,
        bash: true,
      },
      permissionRules: [
        { permission: 'read', pattern: '*', action: 'allow' },
        { permission: 'edit', pattern: 'src/*', action: 'allow' },
        { permission: 'edit', pattern: 'prisma/*', action: 'allow' },
        { permission: 'bash', pattern: 'npm *', action: 'allow' },
        { permission: 'bash', pattern: 'npx *', action: 'allow' },
        { permission: 'bash', pattern: 'git *', action: 'ask' },
        { permission: '*', pattern: '*.env*', action: 'deny' },
        { permission: '*', pattern: 'rm -rf *', action: 'deny' },
      ],
    },
    [AgentRole.QA]: {
      role: AgentRole.QA,
      systemPrompt: `You are the CrewFlow Quality Assurance Agent.
Your responsibility is verifying software correctness through automated test suites, regression tests, edge case exploration, and defect reproduction.
Write comprehensive Vitest tests and verify that suites pass with 100% success.
Do not modify core production business logic unless specifically instructed to patch a verified test harness.`,
      allowedTools: {
        read: true,
        write: true,
        edit: true,
        bash: true,
      },
      permissionRules: [
        { permission: 'read', pattern: '*', action: 'allow' },
        { permission: 'edit', pattern: 'tests/*', action: 'allow' },
        { permission: 'bash', pattern: 'npm run test*', action: 'allow' },
        { permission: 'bash', pattern: 'npx vitest*', action: 'allow' },
        { permission: '*', pattern: '*.env*', action: 'deny' },
      ],
    },
    [AgentRole.REVIEWER]: {
      role: AgentRole.REVIEWER,
      systemPrompt: `You are the CrewFlow Code Reviewer & Security Auditor Agent.
Your responsibility is static analysis, code quality assessment, security vulnerability inspection, and design pattern adherence.
You provide detailed feedback, identify flaws, and verify quality criteria.
You operate primarily in read-only and assessment mode.`,
      allowedTools: {
        read: true,
        write: false,
        edit: false,
        bash: true,
      },
      permissionRules: [
        { permission: 'read', pattern: '*', action: 'allow' },
        { permission: 'bash', pattern: 'npm run build*', action: 'allow' },
        { permission: 'bash', pattern: 'npx eslint*', action: 'allow' },
        { permission: 'bash', pattern: 'tsc*', action: 'allow' },
        { permission: 'edit', pattern: '*', action: 'deny' },
        { permission: '*', pattern: '*.env*', action: 'deny' },
      ],
    },
  };

  /**
   * Retrieves the OpenCode configuration profile for a given role.
   */
  public static getProfile(role: AgentRole): OpenCodeAgentProfile {
    return (
      this.PROFILES[role] ?? {
        role,
        systemPrompt: `You are an AI assistant in CrewFlow specialized in ${role}.`,
        allowedTools: { read: true, write: true, edit: true, bash: false },
        permissionRules: [
          { permission: 'read', pattern: '*', action: 'allow' },
          { permission: '*', pattern: '*.env*', action: 'deny' },
        ],
      }
    );
  }
}
