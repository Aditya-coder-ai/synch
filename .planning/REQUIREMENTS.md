# CrewFlow Backend Requirements

## Phase 1: Backend Foundation (Active)
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

## Future Phases
- Phase 2: Users & Workspaces (Supabase Auth integration, multi-tenancy)
- Phase 3: Projects & Task Graph (Dependency-aware task breakdown and orchestration)
- Phase 4: Agents & Execution Runtime (OpenCode runtime integration)
- Phase 5: Switch Collaboration Protocol & Real-time WebSockets
- Phase 6: Human Approvals & Verification Gateways
- Phase 7: Persistent Project Intelligence & Memory System

