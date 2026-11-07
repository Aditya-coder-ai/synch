# CrewFlow Product & Engineering Roadmap

## Milestone 1: Platform Foundation & Core Execution Engine (COMPLETED)

### Phase 1: Backend Foundation (Completed)
- **Goal**: Production-minded TypeScript/Fastify runtime foundation, Prisma configuration, centralized errors, health/readiness endpoints, security baselines, and test infrastructure.
- **Delivered**: Fastify server, Zod env validation, Prisma client, Helmet/CORS, `/api/v1/health` & `/ready`, Swagger OpenAPI docs, Vitest suite.

### Phase 2: Database Architecture & Data Models (Completed)
- **Goal**: Relational schema covering users, workspaces, projects, tasks, agents, executions, approvals, and shared memory.
- **Delivered**: 14 PostgreSQL Prisma models, relational constraints, enum classifications, initial database migrations, repository access layer.

### Phase 3: Switch Integration (Completed)
- **Goal**: Protocol bridge for official Switch agent rooms and messaging.
- **Delivered**: WebSocket connection manager, Bearer auth, inbound event normalization, room-to-conversation mapping, deduplication logging, echo prevention.

### Phase 4: Agent Orchestration Engine (Completed)
- **Goal**: Autonomous task graph decomposition, topological scheduling, and specialist agent coordination.
- **Delivered**: Coordinator engine, deterministic planning provider, specialist agent registry, topological DAG scheduler, execution dispatch interfaces, state machine.

### Phase 5: OpenCode Agent Runtime (Completed)
- **Goal**: Real code execution in isolated workspaces via OpenCode server API.
- **Delivered**: OpenCode HTTP client (`opencode serve` v1.19.5), session tracking, workspace isolation, execution monitor, result and diff verifier.

### Phase 6: Shared Intelligence & Persistent Memory (Completed)
- **Goal**: Cross-session contextual memory engine for multi-agent coordination.
- **Delivered**: 6 memory categories, semantic and relational retrieval, explainable scoring algorithm, project context builder, execution event extractor.

### Phase 7: Human Approval, Permission Engine & Security (Completed)
- **Goal**: Human-controlled autonomy with risk-calibrated operation gateways.
- **Delivered**: 15 action categories, L0 to L4 risk classification, default-deny policy engine, SHA-256 payload digest binding, approval service, PostgreSQL `AuditLog`, Switch notification bridge.

### Frontend Integration & Hallmark Redesign (Completed)
- **Goal**: Connect React frontend to Fastify backend and redesign according to Hallmark craft standards.
- **Delivered**: Fully connected API client under `/api/v1`, Hallmark Console theme (0 FAIL / 0 REFLEX / 0 WARN), 31/31 interactive handlers preserved, 196 backend tests passing.

---

## Milestone 2: Production SaaS Readiness, Real-Time Streaming & Visual Canvas (PLANNED)

### Phase 8: Real-Time Execution Streaming (SSE / WebSockets for Frontend)
- **Goal**: Stream live agent execution logs, terminal output, and task updates character-by-character to the UI without polling.
- **Scope & Deliverables**:
  - Backend Server-Sent Events (SSE) route: `GET /api/v1/orchestrations/:id/stream`
  - Event streaming pipe for OpenCode runtime stdout/stderr chunks
  - Frontend reactive stream listener in `src/api/client.ts`
  - Live terminal console widget in the Mission Control Console view with auto-scrolling
  - Vitest test coverage for SSE connection, disconnects, and message broadcasting

### Phase 9: Visual Workflow Canvas (React Flow Visual Node Graph)
- **Goal**: Replace static list views in Workflow Studio with an interactive node-graph editor.
- **Scope & Deliverables**:
  - Integration of React Flow (`@xyflow/react`) inside `Workflow Studio`
  - Custom node components for Coordinator, Specialist Agents, Tool Calls, and Approval Gates
  - Visual edge connections displaying dependency constraints and data handoffs
  - Bi-directional sync between visual canvas nodes and the backend Orchestration DAG schema
  - Export/import workflow definitions as JSON/YAML

### Phase 10: Authentication, Multi-Tenancy & Workspace Switcher Modal
- **Goal**: Provide complete user identity management, multi-tenant isolation, and project switching.
- **Scope & Deliverables**:
  - Full Authentication UI: Login, Sign-up, Password reset, and session storage
  - Workspace Switcher Modal in header and sidebar allowing team creation and project selection
  - Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `OBSERVER`) with backend permission enforcement
  - Workspace-scoped memory queues, approval lists, and task isolation
  - User invite flow and collaborator management

### Phase 11: Public API Expansion, Webhooks & Observability
- **Goal**: Provide enterprise integration surfaces and production telemetry.
- **Scope & Deliverables**:
  - Outgoing Webhooks engine: notify external URLs on task completion, failure, or approval requests with HMAC-SHA256 signatures
  - Prometheus `/metrics` endpoint exporting dispatch latency, active executions, and approval wait times
  - OpenTelemetry distributed tracing across Fastify, Coordinator, and OpenCode calls
  - API rate limiting per workspace and API key generation/revocation UI

### Phase 12: Production Deployment, Containerization & CI/CD
- **Goal**: Package CrewFlow into a turnkey production deployment stack.
- **Scope & Deliverables**:
  - Multi-stage production `Dockerfile` for backend and frontend
  - `docker-compose.prod.yml` orchestrating PostgreSQL, Fastify API, OpenCode runtime, and Nginx reverse proxy
  - GitHub Actions CI/CD workflow for automated linting, test suites, Docker build, and registry push
  - Production environment configuration templates, migration runners, and SSL proxy guidance
