export const StreamEventType = {
  CONNECTED: 'connected',
  PING: 'ping',
  ORCHESTRATION_EVENT: 'orchestration:event',
  TASK_STATUS: 'task:status',
  RUNTIME_STDOUT: 'runtime:stdout',
  RUNTIME_STDERR: 'runtime:stderr',
  APPROVAL_REQUESTED: 'approval:requested',
  ORCHESTRATION_COMPLETED: 'orchestration:completed',
  ORCHESTRATION_FAILED: 'orchestration:failed',
} as const;

export type StreamEventType = (typeof StreamEventType)[keyof typeof StreamEventType] | string;

export interface StreamChunk {
  id: string;
  orchestrationId: string;
  eventType: StreamEventType;
  message: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type StreamListener = (chunk: StreamChunk) => void;

