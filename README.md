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
- **Switch Integration Layer**: Real-time communication bridge speaking the official Switch Agent Protocol (WebSocket & HTTP).
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
    ├── health/            # Liveness and readiness monitoring module
    ├── switch/            # Switch Agent Protocol integration module
    ├── orchestration/     # Phase 4 Agent Orchestration & DAG Scheduler
    │   ├── core/          # Orchestrator facade & service
    │   ├── planner/       # Intent analysis & task decomposition
    │   ├── agents/        # Registry, capability matcher & scoring
    │   ├── scheduler/     # Dependency graph & topological tiers
    │   ├── state/         # Strict lifecycle state machine
    │   ├── execution/     # Dispatch abstraction & mock provider
    │   └── events/        # Domain event logging & Switch notifications
    ├── runtime/           # Phase 5 OpenCode Agent Runtime
    │   ├── opencode/      # Authenticated HTTP client & session manager
    │   ├── workspace/     # Project containment & path traversal guard
    │   ├── permissions/   # Least-privilege policy & approval checks
    │   └── execution/     # Real OpenCode executor & result verifier
    └── memory/            # Phase 6 Shared Intelligence & Memory Engine
        ├── extraction/    # Deterministic extractor & secret validator
        ├── storage/       # Project-scoped memory repository & service
        ├── retrieval/     # Text search & explainable ranker
        ├── context/       # Structured agent context builder
        └── maintenance/   # Conflict resolution & soft archiver

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
├── schema-structure.test.ts    # Prisma schema & migration file structure tests
└── switch/
    ├── switch-config.test.ts   # Switch configuration parsing & validation tests
    ├── switch-mapper.test.ts   # Participant identification & frame normalization tests
    ├── switch-events.test.ts   # Inbound pipeline, deduplication, & echo-prevention tests
    ├── switch-client.test.ts   # Health probe & outbound message delivery tests
    └── switch-routes.test.ts   # Switch API routes & status endpoint tests
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
- **Switch Integration**: `SwitchEventLog` (Append-only event deduplication and unmapped room diagnostic log)
- **Decisions**: `Decision` (Project-level persistent decision rationale)
- **Approvals**: `Approval` (Statuses: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`)
- **Execution Tracking**: `Execution` (Statuses: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `AWAITING_APPROVAL`), `ExecutionEvent` (append-only log)
- **Persistent Memory**: `MemoryEntry` (Categories: `PROJECT_CONTEXT`, `USER_PREFERENCE`, `DECISION`, `TECHNICAL_KNOWLEDGE`, `TASK_CONTEXT`, `LESSON_LEARNED`)

---

## 4. Switch Integration Architecture (Phase 3)

See [`docs/switch-integration.md`](file:///docs/switch-integration.md) for full protocol analysis, event catalog, and setup guide.

### Key Capabilities
- **Official Switch Agent Protocol**: Inbound WebSocket stream (`GET /agents/{id}/connection/ws`) with periodic heartbeat ping/pong, and legacy SSE fallback.
- **Event Deduplication**: Database-enforced idempotency via `SwitchEventLog` and `Message.externalMessageId` unique constraints.
- **Room-to-Project Mapping**: Connects Switch rooms to CrewFlow conversations using `Conversation.externalRoomId`.
- **Echo-Loop Prevention**: Ignores messages originating from CrewFlow or the local agent.
- **Outbound Messaging**: Delivers outbound messages to Switch rooms via `POST /agents/{agent_id}/message`.
- **Safe Diagnostics**: Unmapped rooms are safely logged in `SwitchEventLog` without guessing an arbitrary project.

---

## 5. Agent Orchestration Engine (Phase 4)

See [`docs/orchestration-engine.md`](file:///docs/orchestration-engine.md) for planning decomposition strategies, capability scoring, DAG scheduler, and state machine specifications.

### Key Capabilities
- **Baseline Planning**: Analyzes intent and ambiguity to generate structured execution plans for features, bug fixes, refactorings, and security audits.
- **Intelligent Agent Selection**: Capability-based matching with workload penalties to prevent hotspotting and filter unavailable agents (`OFFLINE`, `PAUSED`, `ERROR`).
- **DAG Dependency Scheduler**: Cycle detection with 3-color DFS and topological execution tiers for parallel dispatch.
- **Multi-Agent Handoffs**: Coordinates sequential task progressions (`Coordinator` -> `Developer` -> `QA` -> `Reviewer`).

---

## 6. OpenCode Agent Runtime (Phase 5)

See [`docs/opencode-runtime.md`](file:///docs/opencode-runtime.md) for OpenCode server API integration, role mapping, workspace isolation, and result verification.

### Key Capabilities
- **OpenCode Server API**: Authenticated integration against `opencode serve` (version `1.19.5`) handling sessions, message prompts, diffs, and aborts.
- **Workspace Security**: Strict path traversal prevention ensuring agent mutations remain within approved project folders (`<WORKSPACE_ROOT>/projects/<projectId>`).
- **Least-Privilege Permissions**: Granular policy governing file modifications, test runs, and shell executions with default-deny on sensitive `.env` or secret files.
- **Evidence Verification**: Verifies physical file mutations and test suite exit codes without blindly trusting agent text claims.

---

## 7. Shared Intelligence & Memory Engine (Phase 6)

See [`docs/shared-memory-engine.md`](file:///docs/shared-memory-engine.md) for memory categories, extraction pipelines, explainable ranking, and context injection.

### Key Capabilities
- **Memory Categories**: Manages `DECISION`, `TECHNICAL_KNOWLEDGE`, `LESSON_LEARNED`, `USER_PREFERENCE`, `TASK_CONTEXT`, and `PROJECT_CONTEXT`.
- **Secret & Noise Filtering**: Automatically scrubs passwords, API keys, and connection strings; rejects transient chatter.
- **Explainable Ranking**: Multi-factor scoring formula combining keyword relevance, verification status, category weights, and recency decay.
- **Structured Context Builder**: Assembles bounded, prioritized context for agent runtime prompts with strict project isolation.

---

## 8. Prerequisites

- **Node.js**: `v20+` (tested on Node `v24.x`)
- **Package Manager**: `npm`
- **Database**: Supabase PostgreSQL database instance (or local PostgreSQL)
- **Switch Server** (optional for local deployment): Docker container or hosted Switch instance

---

## 6. Installation & Configuration

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file and configure variables:
   ```bash
   cp .env.example .env
   ```

### Switch Configuration Variables

| Variable | Default | Description |
|---|---|---|
| `SWITCH_ENABLED` | `false` | Enable or disable Switch live background connection |
| `SWITCH_BASE_URL` | `http://localhost:8080` | Base URL of the Switch server bridge |
| `SWITCH_AGENT_ID` | `""` | Registered agent identifier in Switch |
| `SWITCH_API_KEY` | `""` | Agent Bearer API token |
| `SWITCH_TRANSPORT` | `WEBSOCKET` | Inbound transport (`WEBSOCKET` or `SSE`) |
| `SWITCH_CONNECTION_TIMEOUT_MS` | `10000` | Connection timeout in milliseconds |
| `SWITCH_RECONNECT_MAX_ATTEMPTS` | `10` | Maximum reconnection attempts |

---

## 7. Database Setup & Migrations

1. Configure `DATABASE_URL` and `DIRECT_URL` in `.env`.
2. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

---

## 8. Development & Testing Commands

```bash
# Start in development mode with hot reload
npm run dev

# Run test suite
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Start production server
npm start
```

---

## 9. API Documentation

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI JSON**: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)
- **Switch Status**: `GET /api/v1/integrations/switch/status`
- **Switch Health Probe**: `GET /api/v1/integrations/switch/health`
- **Map Room**: `POST /api/v1/integrations/switch/rooms/map`
- **Send Message**: `POST /api/v1/integrations/switch/messages`

---

## 10. License

UNLICENSED - Proprietary to CrewFlow.
