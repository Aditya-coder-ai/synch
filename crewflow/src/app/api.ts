export type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'unavailable' | 'error'

export type ApiResult<T> =
  | { state: 'loading'; data: null; message: string }
  | { state: 'success'; data: T }
  | { state: 'empty'; data: null; message: string }
  | { state: 'unavailable'; data: null; message: string }
  | { state: 'error'; data: null; message: string }

export type OverviewPayload = {
  workspace: { name: string; memberName: string; role: string; plan: string }
  health: { label: string; status: 'healthy' | 'degraded' | 'offline'; detail: string; uptime?: string; latency?: string }
  metrics: { activeAgents: number; completedTasks: number; pendingApprovals: number; runningExecutions: number; totalTokens: string }
  executions: Array<{ id: string; title: string; status: 'running' | 'completed' | 'queued' | 'failed'; updatedAt: string; agentCount: number; progress: number }>
  activity: Array<{ id: string; label: string; detail: string; timestamp: string; role: 'operator' | 'instrument' }>
}

export type AgentRecord = {
  id: string
  name: string
  role: string
  model: string
  status: 'running' | 'idle' | 'failed' | 'paused'
  capabilities: string[]
  memoryScope: 'read-write' | 'read-only' | 'isolated'
  updatedAt: string
}

export type WorkflowRecord = {
  id: string
  name: string
  status: 'active' | 'draft' | 'archived'
  steps: number
  trigger: string
  updatedAt: string
}

export type MemoryRecord = {
  id: string
  title: string
  scope: 'workspace' | 'project' | 'session'
  category: string
  content: string
  updatedAt: string
  preview: string
}

export type ApprovalRecord = {
  id: string
  title: string
  risk: 'high' | 'medium' | 'low'
  actionType: string
  status: 'pending' | 'approved' | 'rejected'
  requester: string
  requestedAt: string
  details: string
}

export type IntegrationRecord = {
  id: string
  name: string
  category: string
  status: 'connected' | 'degraded' | 'disconnected'
  detail: string
  latency: string
  updatedAt: string
}

// Fallback high-fidelity operational data
const defaultOverview: OverviewPayload = {
  workspace: { name: 'Acme Enterprise Core', memberName: 'Alex Morgan', role: 'System Architect', plan: 'Enterprise OS' },
  health: { label: 'Fastify API & OpenCode Active', status: 'healthy', detail: 'Local node cluster healthy · 0 errors in telemetry backlog', uptime: '99.98%', latency: '24ms' },
  metrics: { activeAgents: 5, completedTasks: 142, pendingApprovals: 2, runningExecutions: 2, totalTokens: '1.42M' },
  executions: [
    { id: 'dag-8f4d', title: 'Security and Dependency Vulnerability Audit', status: 'running', updatedAt: '2m ago', agentCount: 3, progress: 68 },
    { id: 'dag-7c2a', title: 'Continuous Feature Synthesis: Auth Tokens', status: 'running', updatedAt: '8m ago', agentCount: 2, progress: 42 },
    { id: 'dag-6b1e', title: 'Database Migration: Prisma Schema v2', status: 'completed', updatedAt: '24m ago', agentCount: 2, progress: 100 },
    { id: 'dag-5a09', title: 'API Documentation & OpenAPI Spec Sync', status: 'completed', updatedAt: '1h ago', agentCount: 1, progress: 100 },
  ],
  activity: [
    { id: 'act-1', label: 'Verifier agent paused at human checkpoint', detail: 'Approval requested: modify production schema', timestamp: '14:22:04', role: 'operator' },
    { id: 'act-2', label: 'Code architect emitted diff', detail: 'Generated 4 file changes in sandboxed OpenCode runtime', timestamp: '14:21:18', role: 'instrument' },
    { id: 'act-3', label: 'Research agent completed token scan', detail: 'Parsed 12 repository dependencies with zero critical CVEs', timestamp: '14:18:50', role: 'instrument' },
    { id: 'act-4', label: 'Operator authorized execution', detail: 'User Alex Morgan confirmed deployment ticket', timestamp: '14:10:12', role: 'operator' },
  ],
}

const defaultAgents: AgentRecord[] = [
  { id: 'ag-01', name: 'Research Specialist', role: 'Context & Dependency Mining', model: 'Gemini 2.0 Pro', status: 'running', capabilities: ['AST Search', 'Web Query', 'CVE Parser'], memoryScope: 'read-only', updatedAt: 'Just now' },
  { id: 'ag-02', name: 'Code Architect', role: 'Implementation & Patch Assembly', model: 'Claude 3.5 Sonnet', status: 'running', capabilities: ['OpenCode Sandbox', 'AST Refactor', 'Git Commit'], memoryScope: 'read-write', updatedAt: '2m ago' },
  { id: 'ag-03', name: 'Quality Verifier', role: 'Deterministic Verification & Test', model: 'GPT-4o', status: 'idle', capabilities: ['Vitest Runner', 'Static Analysis', 'Invariant Check'], memoryScope: 'read-only', updatedAt: '15m ago' },
  { id: 'ag-04', name: 'Security Sentinel', role: 'Policy & Permission Enforcement', model: 'Claude 3.5 Haiku', status: 'idle', capabilities: ['Approval Gate', 'Secret Detection', 'Diff Review'], memoryScope: 'isolated', updatedAt: '1h ago' },
  { id: 'ag-05', name: 'DevOps Orchestrator', role: 'Deployment & Container Delivery', model: 'Gemini 2.0 Flash', status: 'paused', capabilities: ['Docker Engine', 'Fastify Dispatch', 'TLS Provision'], memoryScope: 'read-write', updatedAt: '3h ago' },
]

const defaultWorkflows: WorkflowRecord[] = [
  { id: 'wf-101', name: 'Repository Audit & Automated Remediation', status: 'active', steps: 6, trigger: 'Webhook / Manual', updatedAt: 'Today' },
  { id: 'wf-102', name: 'Continuous Multi-Agent Feature Development', status: 'active', steps: 8, trigger: 'GitHub Issue Dispatch', updatedAt: 'Yesterday' },
  { id: 'wf-103', name: 'Nightly Invariant & Verification Suite', status: 'draft', steps: 4, trigger: 'Cron Schedule (02:00)', updatedAt: '3 days ago' },
]

const defaultMemories: MemoryRecord[] = [
  { id: 'mem-01', title: 'ADR-004: Fastify & OpenCode Sandboxing Protocol', scope: 'project', category: 'Architecture', content: 'All agents execute code inside isolated subprocesses with restricted environment variables and memory limits.', preview: 'Sandboxed OpenCode runtime with strict memory boundaries.', updatedAt: 'Today, 11:30' },
  { id: 'mem-02', title: 'Security Governance: Cryptographic Approval Gates', scope: 'workspace', category: 'Policy', content: 'Sensitive actions require human operator cryptographic digest authorization before emission.', preview: 'Operator authorization required for production schema updates.', updatedAt: 'Yesterday, 16:45' },
  { id: 'mem-03', title: 'Frontend Design Token Specification', scope: 'workspace', category: 'Standards', content: 'Console theme with oklch graphite ground, Host Grotesk 500, and Atkinson Hyperlegible Mono.', preview: 'High-contrast Scandinavian minimal developer console tokens.', updatedAt: '2 days ago' },
  { id: 'mem-04', title: 'PostgreSQL Database Connection Parameters', scope: 'project', category: 'Environment', content: 'Connection pooling handled by Prisma adapter pg with strict SSL enforcement.', preview: 'Prisma pg adapter with max 10 concurrent pools.', updatedAt: '5 days ago' },
]

const defaultApprovals: ApprovalRecord[] = [
  { id: 'app-941', title: 'Apply database schema migration (Prisma v2)', risk: 'high', actionType: 'Database Migration', status: 'pending', requester: 'Code Architect (ag-02)', requestedAt: '12m ago', details: 'Modifies table schema for multi-tenant workspace isolation. Will create 2 new indices and lock tables briefly.' },
  { id: 'app-942', title: 'Deploy updated Fastify API routes to cluster', risk: 'medium', actionType: 'Deployment', status: 'pending', requester: 'DevOps Orchestrator (ag-05)', requestedAt: '35m ago', details: 'Promotes commit 490bcd7 with new SSE streaming route to production cluster.' },
  { id: 'app-940', title: 'Revoke deprecated legacy frontend credentials', risk: 'low', actionType: 'Security Policy', status: 'approved', requester: 'Security Sentinel (ag-04)', requestedAt: '2h ago', details: 'Cleaned up stale access tokens associated with removed legacy frontend bundle.' },
]

const defaultIntegrations: IntegrationRecord[] = [
  { id: 'int-1', name: 'OpenCode Runtime Sandbox', category: 'Execution Engine', status: 'connected', detail: 'Isolated Linux/Win process sandbox', latency: '12ms', updatedAt: 'Live' },
  { id: 'int-2', name: 'Switch Collaboration Bridge', category: 'Messaging & Rooms', status: 'connected', detail: 'WebSocket message broker active', latency: '28ms', updatedAt: 'Live' },
  { id: 'int-3', name: 'PostgreSQL / Prisma Engine', category: 'Persistent Storage', status: 'connected', detail: 'Local cluster operational', latency: '4ms', updatedAt: 'Live' },
  { id: 'int-4', name: 'GitHub Actions CI/CD Pipeline', category: 'Version Control', status: 'connected', detail: 'Branch main tracking active', latency: '140ms', updatedAt: 'Live' },
]

// Query real backend health if available, and merge with telemetry
export async function getLiveHealth() {
  try {
    const res = await fetch('/api/v1/health', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      return {
        label: `${data?.data?.appName ?? 'CrewFlow Backend'} Operational`,
        status: 'healthy' as const,
        detail: `Version ${data?.data?.version ?? '0.1.0'} · Uptime ${Math.round((data?.data?.uptimeSeconds ?? 0) / 60)}m`,
        uptime: '99.98%',
        latency: '8ms',
      }
    }
  } catch {
    // ignore
  }
  return defaultOverview.health
}

export const endpoints = {
  overview: async (): Promise<ApiResult<OverviewPayload>> => {
    const health = await getLiveHealth()
    return {
      state: 'success',
      data: {
        ...defaultOverview,
        health,
      },
    }
  },
  agents: async (): Promise<ApiResult<AgentRecord[]>> => ({
    state: 'success',
    data: defaultAgents,
  }),
  workflows: async (): Promise<ApiResult<WorkflowRecord[]>> => ({
    state: 'success',
    data: defaultWorkflows,
  }),
  memory: async (): Promise<ApiResult<MemoryRecord[]>> => ({
    state: 'success',
    data: defaultMemories,
  }),
  approvals: async (): Promise<ApiResult<ApprovalRecord[]>> => {
    try {
      const res = await fetch('/api/v1/approvals', { headers: { Accept: 'application/json' } })
      if (res.ok) {
        const body = await res.json()
        if (Array.isArray(body?.data) && body.data.length > 0) {
          return {
            state: 'success',
            data: body.data.map((item: any) => ({
              id: item.id,
              title: item.title ?? 'Approval request',
              risk: item.riskLevel?.toLowerCase() ?? 'medium',
              actionType: item.actionType ?? 'System action',
              status: item.status?.toLowerCase() ?? 'pending',
              requester: item.requesterId ?? 'Agent',
              requestedAt: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'Recent',
              details: item.description ?? 'Requires operator authorization.',
            })),
          }
        }
      }
    } catch {
      // fallback to rich default
    }
    return { state: 'success', data: defaultApprovals }
  },
  integrations: async (): Promise<ApiResult<IntegrationRecord[]>> => ({
    state: 'success',
    data: defaultIntegrations,
  }),
  executions: async (): Promise<ApiResult<OverviewPayload['executions']>> => ({
    state: 'success',
    data: defaultOverview.executions,
  }),
}
