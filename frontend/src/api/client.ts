/**
 * CrewFlow API Client
 * Connects the React frontend to the Fastify backend endpoints under /api/v1.
 */

const API_BASE = '/api/v1';

export interface BackendHealth {
  status: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

export interface OrchestrationTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedAgent?: {
    id: string;
    role: string;
    name: string;
  };
}

export interface OrchestrationSummary {
  orchestrationId: string;
  status: string;
  objective: string;
  tasksCount: number;
  plan: {
    objective: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      suggestedRole: string;
      dependencies: string[];
    }>;
  };
  assignedAgents: Array<{
    agentId: string;
    role: string;
    name: string;
  }>;
}

export interface OrchestrationEvent {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface ApprovalItem {
  id: string;
  projectId: string;
  actionType: string;
  actionCategory: string;
  riskLevel: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  expiresAt?: string | null;
  reviewedByUserId?: string | null;
  decisionReason?: string | null;
  createdAt: string;
}

export interface MemoryItem {
  id: string;
  category: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

export interface RuntimeStatus {
  healthy: boolean;
  version: string;
  activeSessions: number;
}

export interface StreamChunk {
  id: string;
  orchestrationId: string;
  eventType: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': 'user-admin', // Default human admin reviewer context
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Fallback to response statusText
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Health Probe
   */
  async getHealth(): Promise<{ data: BackendHealth }> {
    return this.request<{ data: BackendHealth }>('/health');
  }

  /**
   * Initiates autonomous orchestration for a human objective.
   */
  async startOrchestration(objective: string, projectId: string = 'proj-default'): Promise<{ data: OrchestrationSummary }> {
    return this.request<{ data: OrchestrationSummary }>('/orchestrations', {
      method: 'POST',
      body: JSON.stringify({
        objective,
        projectId,
        context: {
          requestedFrom: 'web-frontend',
          priority: 'HIGH',
        },
      }),
    });
  }

  /**
   * Retrieves live orchestration session state.
   */
  async getOrchestration(id: string): Promise<{ data: Record<string, unknown> }> {
    return this.request<{ data: Record<string, unknown> }>(`/orchestrations/${id}`);
  }

  /**
   * Retrieves immutable event trail for an orchestration run.
   */
  async getOrchestrationEvents(id: string): Promise<{ data: OrchestrationEvent[] }> {
    return this.request<{ data: OrchestrationEvent[] }>(`/orchestrations/${id}/events`);
  }

  /**
   * Lists approvals filtered by project and status.
   */
  async getApprovals(projectId?: string, status?: string): Promise<{ data: ApprovalItem[] }> {
    const query = new URLSearchParams();
    if (projectId) query.set('projectId', projectId);
    if (status) query.set('status', status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ data: ApprovalItem[] }>(`/approvals${qs}`);
  }

  /**
   * Approves a pending operation with human authorization.
   */
  async approveAction(id: string, decisionReason?: string): Promise<{ data: ApprovalItem }> {
    return this.request<{ data: ApprovalItem }>(`/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decisionReason }),
    });
  }

  /**
   * Rejects a pending operation.
   */
  async rejectAction(id: string, decisionReason?: string): Promise<{ data: ApprovalItem }> {
    return this.request<{ data: ApprovalItem }>(`/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ decisionReason }),
    });
  }

  /**
   * Fetches persistent memories for a project.
   */
  async getProjectMemories(projectId: string = 'proj-default'): Promise<{ data: MemoryItem[] }> {
    return this.request<{ data: MemoryItem[] }>(`/projects/${projectId}/memory`);
  }

  /**
   * Fetches OpenCode runtime health.
   */
  async getRuntimeHealth(): Promise<{ data: RuntimeStatus }> {
    return this.request<{ data: RuntimeStatus }>('/runtime/health');
  }

  /**
   * Connects to live Server-Sent Events (SSE) execution stream.
   * Dispatches chunks to onChunk callback. Returns unsubscription cleanup function.
   */
  streamOrchestration(
    orchestrationId: string,
    onChunk: (chunk: StreamChunk) => void,
    onError?: (error: Event) => void,
  ): () => void {
    const url = `${API_BASE}/orchestrations/${encodeURIComponent(orchestrationId)}/stream`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamChunk;
        onChunk(data);
      } catch {
        // Fallback for non-JSON lines
      }
    };

    const eventTypes = [
      'connected',
      'orchestration:event',
      'task:status',
      'runtime:stdout',
      'runtime:stderr',
      'approval:requested',
      'orchestration:completed',
      'orchestration:failed',
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as StreamChunk;
          onChunk(data);
        } catch {
          // Fallback
        }
      });
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  }
}

export const api = new ApiClient();

