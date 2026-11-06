import type { ExecutionStatus } from '../../database/types.js';

export const RuntimeConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  READY: 'READY',
  BUSY: 'BUSY',
  ERROR: 'ERROR',
  STOPPING: 'STOPPING',
} as const;

export type RuntimeConnectionStateType =
  (typeof RuntimeConnectionState)[keyof typeof RuntimeConnectionState];

export interface OpenCodeHealth {
  healthy: boolean;
  version: string;
}

export interface VerificationEvidence {
  verified: boolean;
  filesModified: string[];
  diffSummary?: string;
  testPassed?: boolean;
  exitCode?: number;
  checks: {
    diffPresent: boolean;
    filesExist: boolean;
    testsVerified: boolean;
  };
  details: string[];
}

export interface RuntimeExecutionSummary {
  executionId: string;
  sessionId: string;
  taskId: string;
  agentId: string;
  projectId: string;
  status: ExecutionStatus;
  outputSummary: string;
  evidence: VerificationEvidence;
  logsTruncated: boolean;
  durationMs: number;
  error?: string | null;
}
