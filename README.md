# CrewFlow - Backend

> Production-minded, modular backend foundation for **CrewFlow**, an AI-powered multi-agent collaboration and execution platform.

---

## 1. What is CrewFlow?

**CrewFlow** enables humans and AI agents to work together as one coordinated execution team. It bridges human user intent with autonomous specialist AI agents, Switch collaboration rooms, and OpenCode execution runtimes.

### Core Workflow
```
Human Request ──► Coordinator Agent ──► Task Decomposition ──► Specialist Agents
                                                                     │
Completion   ◄──   Verification   ◄──  Human Approval  ◄──   Execution
```

### Core Principles
- **Shared project intelligence**: Consolidated context across all agents and human collaborators.
- **Multi-agent orchestration**: Dynamic task decomposition, scheduling, and agent delegation.
- **Dependency-aware task execution**: Strict topological ordering for complex workflows.
- **Human-controlled autonomy**: Safe guardrails with human approvals at critical decision points.
- **Verifiable execution results**: Deterministic and reproducible verification of deliverables.
- **Persistent project memory**: Long-term state and memory retention across execution sessions.

---

## 2. Backend Architecture

CrewFlow is built as a **modular monolith** with strict separation of concerns:
- **Routing & Controllers**: Fastify route definitions handling HTTP contracts and input validation.
- **Business Logic Services**: Dedicated services containing pure domain logic without HTTP or DB couplings.
- **Database Access Layer**: Prisma ORM with Supabase PostgreSQL, typed domain models, centralized error translation, and DAG cycle detectors.
- **Cross-Cutting Concerns**: Centralized error mapping, request logging with sensitive field redaction, and Zod type-safe validation.

### Directory Structure
```
src/
├── app.ts                 # Fastify application factory & plugin composition
├── server.ts              # Server bootstrapper & graceful shutdown lifecycle
├── config/
│   └── env.ts             # Zod-validated environment configuration
├── common/
│   ├── errors/            # AppError hierarchy, error codes & centralized error handler
│   ├── types/             # Standardized API response contracts
│   ├── utils/             # Response helper functions
│   └── validation/        # Zod input schemas for Workspaces, Projects, Tasks, etc.
├── database/
│   ├── index.ts           # Central database exports
│   ├── prisma.ts          # Reusable Prisma client & database health checks
│   ├── types.ts           # Domain models and enum definitions
│   ├── errors.ts          # Prisma error code mapper (P2002 -> Conflict, P2025 -> NotFound)
│   └── validators.ts      # DAG cycle detector & assignment rule validators
└── modules/
    └── health/            # Liveness and readiness monitoring module
        ├── health.schema.ts
        ├── health.service.ts
        └── health.routes.ts

prisma/
├── schema.prisma          # Supabase PostgreSQL relational schema definition
└── migrations/            # Version-controlled SQL migrations for Supabase

tests/
├── env.test.ts                 # Environment parsing & validation tests
├── errors.test.ts              # Centralized error handler & 404 tests
├── health.test.ts              # Health and readiness probe tests
├── swagger.test.ts             # OpenAPI schema & Swagger UI tests
├── database-validators.test.ts # Task assignment & DAG cycle detection tests
├── database-errors.test.ts     # Prisma code mapping to AppErrors tests
├── validation-schemas.test.ts  # Zod schema validation tests
└── schema-structure.test.ts    # Prisma schema & migration file structure tests
```

---

## 3. Database Architecture & Data Models (Phase 2)

See [`docs/database.md`](file:///docs/database.md) for the full architectural specification, ER diagram, and deletion rules.

### Implemented Models
- **Users & Workspaces**: `User`, `Workspace`, `WorkspaceMember` (Roles: `OWNER`, `ADMIN`, `MEMBER`)
- **Projects**: `Project` (Statuses: `PLANNING`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`)
- **Tasks & Dependencies**: `Task` (Statuses: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETED`, `CANCELLED`; Priorities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `TaskDependency`
- **Agents**: `Agent` (Roles: `COORDINATOR`, `DEVELOPER`, `QA`, `REVIEWER`; Statuses: `ACTIVE`, `IDLE`, `BUSY`, `PAUSED`, `ERROR`, `OFFLINE`)
- **Conversations & Messages**: `Conversation`, `Message` (Senders: `HUMAN`, `AGENT`, `SYSTEM`)
- **Decisions**: `Decision` (Project-level persistent decision rationale)
- **Approvals**: `Approval` (Statuses: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`)
- **Execution Tracking**: `Execution` (Statuses: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `AWAITING_APPROVAL`), `ExecutionEvent` (append-only log)
- **Persistent Memory**: `MemoryEntry` (Categories: `PROJECT_CONTEXT`, `USER_PREFERENCE`, `DECISION`, `TECHNICAL_KNOWLEDGE`, `TASK_CONTEXT`, `LESSON_LEARNED`)

### Key Invariants & Safeguards
1. **Single Assignee Invariant**: A task can be assigned to a human (`assignedUserId`) OR an AI agent (`assignedAgentId`), but **never both simultaneously**.
2. **Self-Dependency Prohibition**: A task cannot depend on itself (`taskId != dependsOnTaskId`).
3. **Cross-Project Dependency Prohibition**: Dependencies across different projects are disallowed.
4. **DAG Cycle Prevention**: Multi-step cycles (A → B → C → A) are detected using application-level Depth-First Search (`detectDependencyCycle`).
5. **Secret Redaction**: Agent configurations strictly forbid storing secrets, API keys, or passwords.

---

## 4. Prerequisites

- **Node.js**: `v20+` (tested on Node `v24.x`)
- **Package Manager**: `npm`
- **Database**: Supabase PostgreSQL database instance (or local PostgreSQL)

---

## 5. Installation

Clone the repository and install dependencies:

```bash
npm install
```

---

## 6. Environment Configuration

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `enum` | `development` | Deployment environment (`development`, `test`, `production`) |
| `PORT` | `number` | `3000` | Port for the HTTP server to listen on |
| `HOST` | `string` | `0.0.0.0` | Network binding host |
| `LOG_LEVEL` | `enum` | `info` | Logger severity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) |
| `CORS_ORIGIN` | `string` | `*` | Allowed CORS origins (comma-separated or `*`) |
| `BODY_LIMIT` | `number` | `1048576` | Maximum request body limit in bytes (1MB) |
| `DATABASE_URL` | `string` | *(optional)* | Supabase pooled connection string (port 6543) for runtime queries |
| `DIRECT_URL` | `string` | *(optional)* | Supabase direct connection string (port 5432) for Prisma migrations |

---

## 7. Database Setup & Migrations

1. Configure `DATABASE_URL` and `DIRECT_URL` in your `.env` file with your Supabase credentials:
   ```env
   # Transaction pooling (runtime)
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   # Direct connection (migrations)
   DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```

2. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

3. Run migrations on Supabase:
   ```bash
   npm run prisma:migrate
   ```

---

## 8. Development Commands

| Command | Action |
|---|---|
| `npm run dev` | Starts server with live reloading via `tsx watch` |
| `npm run build` | Compiles TypeScript to JavaScript into `dist/` |
| `npm start` | Runs the compiled server from `dist/server.js` |
| `npm run lint` | Runs ESLint analysis across TypeScript files |
| `npm run lint:fix` | Runs ESLint and auto-fixes issues |
| `npm run format` | Formats codebase using Prettier |
| `npm run format:check` | Verifies code formatting |

---

## 9. Testing Commands

All unit and integration tests are powered by **Vitest**:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with code coverage report
npm run test:coverage
```

---

## 10. API Documentation

Interactive Swagger OpenAPI 3.0 documentation is automatically generated and accessible in your browser:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI JSON**: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

---

## 11. License

UNLICENSED - Proprietary to CrewFlow.
