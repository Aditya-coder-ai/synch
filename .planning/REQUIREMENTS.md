# CrewFlow Backend Requirements

## Phase 1: Backend Foundation (Completed)
- [x] Node.js + TypeScript (strict mode) initialization
- [x] Fastify web framework setup
- [x] Zod environment variable validation (`.env.example`)
- [x] Prisma ORM configuration with Supabase PostgreSQL (pooler & direct URLs)
- [x] Centralized error handling and standardized JSON error envelope
- [x] Request logging with sensitive credential redaction
- [x] Security headers (Helmet) & environment-configured CORS
- [x] Sensible request body limit (1MB default)
- [x] Health monitoring:
  - `GET /api/v1/health` (liveness probe with metadata)
  - `GET /api/v1/health/ready` (readiness probe verifying database connectivity)
- [x] Swagger OpenAPI 3.0 documentation (`/docs`, `/docs/json`)
- [x] Automated testing suite with Vitest
- [x] Developer tooling: ESLint, Prettier, scripts (`dev`, `build`, `start`, `test`, `lint`, `format`)

## Phase 2: Database Architecture & Data Models (Completed)
- [x] 14 Relational PostgreSQL Prisma Models:
  - User, Workspace, WorkspaceMember
  - Project
  - Task, TaskDependency
  - Agent
  - Conversation, Message
  - Decision
  - Approval
  - Execution, ExecutionEvent
  - MemoryEntry
- [x] Explicit Enums:
  - `WorkspaceRole`, `ProjectStatus`, `TaskStatus`, `TaskPriority`, `AgentRole`, `AgentStatus`, `MessageSenderType`, `ApprovalStatus`, `ExecutionStatus`, `MemoryCategory`
- [x] Database Constraints & Integrity:
  - Single assignee constraint (human OR agent, not both)
  - Self-dependency prohibition & cross-project dependency prohibition
  - DFS-based multi-step DAG cycle detection
  - Composite indexes on high-frequency query paths
  - Safe cascading and set-null referential actions
- [x] PostgreSQL Migration DDL (`prisma/migrations/20261106_init_phase2_models/migration.sql`)
- [x] Application-level Database Access Layer (`src/database/`):
  - Typed models, error code translation (P2002 -> Conflict, P2025 -> NotFound, etc.)
- [x] Zod Data Validation Schemas (`src/common/validation/`)
- [x] Comprehensive Test Suite covering validators, errors, schemas, and structure
- [x] Comprehensive Database Documentation (`docs/database.md`)

## Future Phases
- Phase 3: Users & Workspaces API (Supabase Auth integration, multi-tenancy)
- Phase 4: Projects & Task Graph Engine (Dependency DAG execution & state machines)
- Phase 5: Specialist Agents & OpenCode Runtime Integration
- Phase 6: Switch Collaboration Protocol & Real-time WebSockets
- Phase 7: Human Approval Gateways & Verifiable Execution
- Phase 8: Persistent Project Intelligence & Memory Retrieval
