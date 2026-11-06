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
- **Database Access**: Prisma ORM with Supabase PostgreSQL, supporting connection pooling for runtime queries and direct connections for migrations.
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
│   └── utils/             # Response helper functions
├── database/
│   └── prisma.ts          # Reusable Prisma client & database health checks
└── modules/
    └── health/            # Liveness and readiness monitoring module
        ├── health.schema.ts
        ├── health.service.ts
        └── health.routes.ts

prisma/
└── schema.prisma          # Supabase PostgreSQL datasource definition

tests/
├── env.test.ts            # Environment parsing & validation tests
├── errors.test.ts         # Centralized error handler & 404 tests
├── health.test.ts         # Health and readiness probe tests
└── swagger.test.ts        # OpenAPI schema & Swagger UI tests
```

---

## 3. Prerequisites

- **Node.js**: `v20+` (tested on Node `v24.x`)
- **Package Manager**: `npm`
- **Database**: Supabase PostgreSQL database instance (or local PostgreSQL)

---

## 4. Installation

Clone the repository and install dependencies:

```bash
npm install
```

---

## 5. Environment Configuration

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
| `DATABASE_URL` | `string` | *(optional)* | Supabase pooled connection string (port 6543) |
| `DIRECT_URL` | `string` | *(optional)* | Supabase direct connection string (port 5432) for migrations |

---

## 6. Database Setup

1. Configure `DATABASE_URL` and `DIRECT_URL` in your `.env` file with your Supabase credentials:
   ```env
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```

2. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

---

## 7. Development Commands

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

## 8. Testing Commands

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

## 9. API Documentation

Interactive Swagger OpenAPI 3.0 documentation is automatically generated and accessible in your browser:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI JSON**: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

### Available Endpoints (Phase 1)

#### 1. Liveness Probe
```http
GET /api/v1/health
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "appName": "CrewFlow Backend",
    "version": "0.1.0",
    "environment": "development",
    "timestamp": "2026-11-06T13:40:00.000Z",
    "uptimeSeconds": 42
  }
}
```

#### 2. Readiness Probe
```http
GET /api/v1/health/ready
```
**Response (200 OK - Database Healthy):**
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 8
      }
    },
    "timestamp": "2026-11-06T13:40:00.000Z"
  }
}
```
**Response (503 Service Unavailable - Database Unreachable):**
```json
{
  "success": false,
  "data": {
    "status": "not_ready",
    "checks": {
      "database": {
        "status": "down",
        "error": "Database connection failed"
      }
    },
    "timestamp": "2026-11-06T13:40:00.000Z"
  }
}
```

#### 3. Standardized Error Response Format
All errors return uniform envelopes:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /api/v1/unknown not found"
  },
  "timestamp": "2026-11-06T13:40:00.000Z",
  "path": "/api/v1/unknown"
}
```

---

## 10. License

UNLICENSED - Proprietary to CrewFlow.

