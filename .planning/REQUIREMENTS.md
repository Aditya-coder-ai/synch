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
- [x] 14 Relational PostgreSQL Prisma Models (User, Workspace, Project, Task, Agent, Conversation, Message, etc.)
- [x] Explicit PostgreSQL Enums
- [x] Database Constraints & Integrity (Single assignee constraint, self-dependency prohibition, DAG cycle detection)
- [x] PostgreSQL Migration DDL
- [x] Application-level Database Access Layer (`src/database/`)
- [x] Zod Data Validation Schemas (`src/common/validation/`)
- [x] Comprehensive Database Documentation (`docs/database.md`)

## Phase 3: Switch Integration (Completed)
- [x] Verified Official Switch Agent Protocol (`https://docs.switchagents.ai/mcp`)
- [x] Switch Integration Module (`src/modules/switch/`):
  - Inbound WebSocket (`GET /agents/{id}/connection/ws`) with heartbeats and SSE fallback
  - Outbound messaging via official `POST /agents/{agent_id}/message`
  - Inbound event normalization (`NormalizedSwitchEvent`)
  - Participant ID identification (`@switch-user-*`, `@switch-agent-*`, `@switch-admin`)
  - Event deduplication and unmapped room diagnostic logging (`SwitchEventLog`, `Message.externalMessageId`)
  - Echo-loop prevention
  - Room-to-conversation mapping (`Conversation.externalRoomId`)
  - Integration health & status endpoints (`GET /api/v1/integrations/switch/status`, `/health`)
  - Administrative room mapping endpoint (`POST /api/v1/integrations/switch/rooms/map`)
  - Outbound message endpoint (`POST /api/v1/integrations/switch/messages`)
- [x] Switch Migration DDL (`prisma/migrations/20261106_add_switch_event_log/migration.sql`)
- [x] Complete Vitest test suite for Switch configuration, mapper, events, client, and routes
- [x] Technical documentation (`docs/switch-integration.md`)

## Future Phases
- Phase 4: Users & Workspaces API (Supabase Auth integration, multi-tenancy)
- Phase 5: Projects & Task Graph Engine (Dependency DAG execution & state machines)
- Phase 6: Specialist Agents & OpenCode Runtime Integration
- Phase 7: Human Approval Gateways & Verifiable Execution
- Phase 8: Persistent Project Intelligence & Memory Retrieval
