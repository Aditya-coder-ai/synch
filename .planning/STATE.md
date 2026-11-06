# CrewFlow Project State

## Active Milestone: Milestone 1 - Platform Foundation & Core Services
## Completed Phase: Phase 2 - Database Architecture & Data Models
**Status**: Completed and Verified
**Last Updated**: 2026-11-06

### Key Decisions Made in Phase 2
1. **Relational Normalization**: Modeled 14 entities supporting multi-tenancy, projects, tasks, agents, conversations, decisions, approvals, executions, and memory.
2. **Explicit PostgreSQL Enums**: Avoided arbitrary status strings; used strongly-typed enums for `WorkspaceRole`, `ProjectStatus`, `TaskStatus`, `TaskPriority`, `AgentRole`, `AgentStatus`, `MessageSenderType`, `ApprovalStatus`, `ExecutionStatus`, and `MemoryCategory`.
3. **Single Assignee Invariant**: Enforced that a task can be assigned to either a human user OR an AI agent, never both simultaneously, at both the DB constraint level and application validation layer.
4. **DAG Cycle Prevention**: Implemented graph cycle detection using Depth-First Search in `src/database/validators.ts` to detect multi-node dependency loops before persisting.
5. **Security Hardening**: Agent configuration schemas strictly reject keys containing passwords, secrets, or API keys.
6. **Safe Cascade Rules**: Cascades are restricted to child owned records (e.g. project -> tasks), while audit entities (approvals, decisions) use `SET NULL` on deletion to retain audit trails.
