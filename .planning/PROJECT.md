# CrewFlow: AI-Powered Multi-Agent Collaboration and Execution Platform

## 1. Product Vision
CrewFlow enables humans and specialized AI agents to work together as a single coordinated execution team.
Workflow:
Human Request → Coordinator Agent → Task Decomposition → Specialist Agents → Execution → Human Approval → Verification → Completion.

## 2. Core Principles
- **Shared project intelligence**: Centralized context across human collaborators and autonomous agents.
- **Multi-agent orchestration**: Dynamic task graph creation, scheduling, and delegation.
- **Dependency-aware task execution**: Topological task ordering ensuring prerequisite tasks complete before dependents execute.
- **Human-controlled autonomy**: Human approval checkpoints for critical operations.
- **Verifiable execution results**: Concrete verification and automated health/quality checks.
- **Persistent project memory**: State preservation across sessions and agent lifecycles.

## 3. Technology Stack
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (strict mode)
- **Framework**: Fastify
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Documentation**: Swagger / OpenAPI (via `@fastify/swagger` and `@fastify/swagger-ui`)
- **Testing**: Vitest
- **Package Manager**: npm

## 4. Architectural Boundaries
Modular Monolith with decoupled modules:
- `config`
- `database`
- `common` (errors, middleware, plugins, types, utils)
- `health`
- `users` (future phase)
- `workspaces` (future phase)
- `projects` (future phase)
- `tasks` (future phase)
- `agents` (future phase)
- `orchestration` (future phase)
- `switch` (future phase)
- `opencode` (future phase)
- `memory` (future phase)
- `approvals` (future phase)
- `events` (future phase)

