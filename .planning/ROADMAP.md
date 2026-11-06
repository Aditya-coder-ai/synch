# CrewFlow Backend Roadmap

## Milestone 1: Platform Foundation & Core Services

### Phase 1: Backend Foundation (CURRENT)
- **Goal**: Establish the production-minded TypeScript/Fastify runtime foundation, Prisma configuration, centralized errors, health/readiness endpoints, security baselines, and test infrastructure.
- **Deliverables**:
  - Validated configuration (`src/config/env.ts`)
  - Modular error handling (`src/common/errors/`)
  - Fastify server with CORS, Helmet, Swagger (`src/app.ts`, `src/server.ts`)
  - Prisma client configuration with Supabase (`src/database/prisma.ts`)
  - Health & readiness probes (`src/modules/health/`)
  - Comprehensive unit and integration test suite (`tests/`)

### Phase 2: Users & Workspaces (Upcoming)
- Supabase Auth token verification
- Multi-tenant workspaces and role-based access control (RBAC)
- User profile management

### Phase 3: Project & Task Decomposition Engine
- Project data structures and dependency DAG
- Topological task ordering and state machine

### Phase 4: Specialist Agents & OpenCode Runtime
- Specialist agent definitions and capabilities
- OpenCode execution runtime bridges

### Phase 5: Switch Collaboration Rooms & Real-time Sync
- Socket.IO real-time channels
- Agent-to-human and agent-to-agent collaboration rooms

### Phase 6: Human Approval Gateways & Verifications
- Approval checkpoint policies
- Automated verification pipelines

### Phase 7: Persistent Project Intelligence & Memory
- Vector / semantic memory retention
- Long-term context retrieval for coordinator agent

