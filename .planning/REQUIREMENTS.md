# CrewFlow Requirements Matrix

## Milestone 1: Platform Foundation & Core Services (COMPLETED)

### Phase 1: Backend Foundation (Completed)
- [x] Node.js + TypeScript (strict mode) initialization
- [x] Fastify web framework setup
- [x] Zod environment variable validation (`.env.example`)
- [x] Prisma ORM configuration with Supabase PostgreSQL (pooler & direct URLs)
- [x] Centralized error handling and standardized JSON error envelope
- [x] Request logging with sensitive credential redaction
- [x] Security headers (Helmet) & environment-configured CORS
- [x] Health monitoring (`/api/v1/health` and `/api/v1/health/ready`)
- [x] Swagger OpenAPI 3.0 documentation (`/docs`, `/docs/json`)
- [x] Automated testing suite with Vitest

### Phase 2: Database Architecture & Data Models (Completed)
- [x] 14 Relational PostgreSQL Prisma Models (User, Workspace, Project, Task, Agent, Execution, Approval, Memory, etc.)
- [x] Explicit PostgreSQL Enums
- [x] Database Constraints & Integrity (Single assignee, self-dependency prohibition, DAG cycle detection)
- [x] Application-level Database Access Layer (`src/database/`)
- [x] Zod Data Validation Schemas (`src/common/validation/`)

### Phase 3: Switch Integration (Completed)
- [x] Verified Official Switch Agent Protocol (`https://docs.switchagents.ai/mcp`)
- [x] Inbound WebSocket with heartbeats and outbound messaging via `POST /agents/{agent_id}/message`
- [x] Participant ID identification (`@switch-user-*`, `@switch-agent-*`, `@switch-admin`)
- [x] Event deduplication and unmapped room diagnostic logging (`SwitchEventLog`)
- [x] Room-to-conversation mapping (`Conversation.externalRoomId`)

### Phase 4: Agent Orchestration Engine (Completed)
- [x] Coordinator entrypoint decomposing human requests into structured execution plans
- [x] Deterministic planning provider with Zod-validated plan output schemas
- [x] Specialist agent registry with capability and role matching (`COORDINATOR`, `DEVELOPER`, `QA`, `REVIEWER`)
- [x] Topological task scheduler and dependency DAG resolution
- [x] Orchestration state machine and execution manager
- [x] API routes for orchestrations (`POST /api/v1/orchestrations`, `GET /api/v1/orchestrations/:id`, `GET /api/v1/orchestrations/:id/events`)

### Phase 5: OpenCode Agent Runtime (Completed)
- [x] Dedicated OpenCode runtime module (`src/modules/runtime/`)
- [x] HTTP client for official OpenCode server API (`opencode serve` v1.19.5)
- [x] Workspace sandbox management with directory path isolation
- [x] Execution monitor with command execution and output capture
- [x] Execution verifier validating exit codes and filesystem diff evidence
- [x] Runtime health endpoint (`GET /api/v1/runtime/health`)

### Phase 6: Shared Intelligence & Persistent Memory (Completed)
- [x] 6 Structured memory categories (`ARCHITECTURAL_DECISION`, `TECHNICAL_CONVENTION`, `LESSON_LEARNED`, `FAILURE_ANALYSIS`, `EXECUTION_PATTERN`, `PROJECT_CONTEXT`)
- [x] Semantic vector and relational retrieval with explainable relevance scoring
- [x] Project context builder injecting relevant memories into coordinator prompts
- [x] Memory extraction pipeline capturing lessons from completed execution events
- [x] Memory API routes (`POST /api/v1/projects/:id/memory`, `GET /api/v1/projects/:id/memory`, `POST /api/v1/projects/:id/memory/search`)

### Phase 7: Human Approval, Permission Engine & Security (Completed)
- [x] 15 Internal CrewFlow action categories (`FILE_READ`, `FILE_CREATE`, `FILE_MODIFY`, `FILE_DELETE`, `COMMAND_EXECUTE`, etc.)
- [x] L0 to L4 risk classification matrix with default-deny policy evaluator
- [x] SHA-256 payload digest binding preventing tampering with approval payloads
- [x] Approval lifecycle service (`createApproval`, `approve`, `reject`, expiration)
- [x] Execution guard intercepting high-risk operations
- [x] Immutable PostgreSQL `AuditLog` service recording every security decision
- [x] Switch notification service for urgent human approval pings
- [x] Approvals API routes (`GET /api/v1/approvals`, `POST /api/v1/approvals/:id/approve`, `POST /api/v1/approvals/:id/reject`)

### Frontend Integration & Hallmark Redesign (Completed)
- [x] React 19 + TypeScript + Vite frontend located in `frontend/`
- [x] Connected to live backend via `frontend/src/api/client.ts` (`/api/v1`)
- [x] Redesigned under Hallmark Console theme standard (0 FAIL, 0 REFLEX, 0 WARN on sloplint)
- [x] All 31 interactive handlers preserved
- [x] Production build clean (`tsc -b && vite build`)

---

## Milestone 2: Production Readiness, Visual Experience & SaaS Operations (PLANNED)

### Phase 8: Real-Time Execution Streaming (SSE / WebSockets for Frontend) (Completed)
- [x] SSE endpoint `GET /api/v1/orchestrations/:id/stream`
- [x] Real-time stdout/stderr chunk emission from OpenCode runtime
- [x] Frontend reactive stream client in `src/api/client.ts`
- [x] Streaming terminal output component with autoscroll in Mission Control Console
- [x] Comprehensive test suite covering SSE stream lifecycle, reconnection, and backlogs (9 tests)

### Phase 9: Visual Workflow Canvas (React Flow)
- [ ] Install and configure `@xyflow/react`
- [ ] Custom agent, tool, approval, and task nodes
- [ ] Interactive drag-and-drop edge connections
- [ ] Bi-directional sync between visual node graph and Orchestration DAG JSON schema
- [ ] Workflow Studio canvas integration

### Phase 10: Authentication, Multi-Tenancy & Workspace Switcher Modal
- [ ] Login, Sign-up, and session token management UI
- [ ] Workspace switcher modal in header and sidebar
- [ ] Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `OBSERVER`)
- [ ] Multi-tenant workspace data isolation for tasks, memory, and approvals

### Phase 11: Public API Expansion, Webhooks & Observability
- [ ] Outgoing webhooks engine with HMAC signature verification
- [ ] Prometheus metrics endpoint (`/metrics`)
- [ ] OpenTelemetry distributed tracing
- [ ] Workspace API key management and rate limiting

### Phase 12: Production Deployment, Containerization & CI/CD
- [ ] Multi-stage production `Dockerfile` for backend and frontend
- [ ] `docker-compose.prod.yml` orchestrating PostgreSQL, Fastify API, OpenCode, and Nginx
- [ ] GitHub Actions CI/CD workflow for automated linting, test suites, and container build
