export type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'unavailable' | 'error'

export type ApiResult<T> =
  | { state: 'loading'; data: null; message: string }
  | { state: 'success'; data: T }
  | { state: 'empty'; data: null; message: string }
  | { state: 'unavailable'; data: null; message: string }
  | { state: 'error'; data: null; message: string }

export type OverviewPayload = {
  workspace?: { name?: string; memberName?: string; role?: string }
  health?: { label?: string; status?: 'healthy' | 'degraded' | 'offline'; detail?: string }
  metrics?: { activeAgents?: number; completedTasks?: number; pendingApprovals?: number; runningExecutions?: number }
  executions?: Array<{ id: string; title: string; status: string; updatedAt?: string; agentCount?: number }>
  activity?: Array<{ id: string; label: string; detail?: string; timestamp?: string; tone?: string }>
}

export type AgentRecord = { id: string; name: string; role?: string; status: 'running' | 'idle' | 'failed' | 'paused' | string; capabilities?: string[]; updatedAt?: string }
export type WorkflowRecord = { id: string; name: string; status?: string; steps?: number; updatedAt?: string }
export type MemoryRecord = { id: string; title: string; scope?: string; updatedAt?: string; preview?: string }
export type ApprovalRecord = { id: string; title: string; risk?: 'low' | 'medium' | 'high' | string; requestedAt?: string; requester?: string }
export type IntegrationRecord = { id: string; name: string; status: 'connected' | 'degraded' | 'disconnected' | string; detail?: string; updatedAt?: string }

const API_BASE = (import.meta.env.VITE_CREWFLOW_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const hasBackend = Boolean(API_BASE)

export class ApiUnavailableError extends Error {
  constructor() {
    super('No CrewFlow API base URL is configured for this project.')
    this.name = 'ApiUnavailableError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!hasBackend) throw new ApiUnavailableError()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`CrewFlow API returned ${response.status}`)
  return response.json() as Promise<T>
}

function normalize<T>(value: T | null | undefined, label: string): ApiResult<T> {
  if (value == null) return { state: 'empty', data: null, message: `No ${label} is available yet.` }
  if (Array.isArray(value) && value.length === 0) return { state: 'empty', data: null, message: `No ${label} is available yet.` }
  return { state: 'success', data: value }
}

export async function loadResource<T>(path: string, label: string): Promise<ApiResult<T>> {
  if (!hasBackend) return { state: 'unavailable', data: null, message: 'Connect a CrewFlow API to load live workspace data.' }
  try {
    const data = await request<T>(path)
    return normalize(data, label)
  } catch (error) {
    return { state: 'error', data: null, message: error instanceof Error ? error.message : 'The workspace could not load this data.' }
  }
}

export const endpoints = {
  overview: () => loadResource<OverviewPayload>('/api/overview', 'overview data'),
  agents: () => loadResource<AgentRecord[]>('/api/agents', 'agents'),
  workflows: () => loadResource<WorkflowRecord[]>('/api/workflows', 'workflows'),
  memory: () => loadResource<MemoryRecord[]>('/api/memory', 'memory records'),
  approvals: () => loadResource<ApprovalRecord[]>('/api/approvals', 'approvals'),
  integrations: () => loadResource<IntegrationRecord[]>('/api/integrations', 'integrations'),
  executions: () => loadResource<OverviewPayload['executions']>('/api/executions', 'executions'),
}

export function openExecutionStream(executionId: string, onMessage: (event: MessageEvent) => void, onError: () => void) {
  if (!hasBackend || typeof EventSource === 'undefined') {
    onError()
    return () => undefined
  }
  const stream = new EventSource(`${API_BASE}/api/executions/${encodeURIComponent(executionId)}/events`, { withCredentials: true })
  stream.addEventListener('message', onMessage)
  stream.addEventListener('error', onError)
  return () => stream.close()
}
