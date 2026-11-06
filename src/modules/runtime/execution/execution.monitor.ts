import type { PrismaClient, Prisma } from '@prisma/client';
import { getPrismaClient } from '../../../database/prisma.js';
import { ExecutionStatus } from '../../../database/types.js';

export interface ExecutionMonitorOptions {
  prismaClient?: PrismaClient;
  maxOutputBytes?: number;
}

export class ExecutionMonitor {
  private readonly prisma: PrismaClient;
  private readonly maxOutputBytes: number;

  constructor(options: ExecutionMonitorOptions = {}) {
    this.prisma = options.prismaClient ?? getPrismaClient();
    this.maxOutputBytes = options.maxOutputBytes ?? 65536; // 64KB default
  }

  /**
   * Sanitizes text by redacting common secret formats.
   */
  public sanitizeSecrets(input: string): string {
    if (!input) return '';

    return input
      .replace(/(?:password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?([^"',\s]+)/gi, '$1: [REDACTED]')
      .replace(/(?:bearer\s+)([a-zA-Z0-9_\-\.]{20,})/gi, 'Bearer [REDACTED]')
      .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs, '[REDACTED PRIVATE KEY]')
      .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi, 'postgresql://[REDACTED_USER]:[REDACTED_PW]@[HOST]');
  }

  /**
   * Safely truncates output to prevent database bloat.
   */
  public truncateOutput(output: string): { text: string; truncated: boolean } {
    const sanitized = this.sanitizeSecrets(output);
    const buffer = Buffer.from(sanitized, 'utf-8');

    if (buffer.length <= this.maxOutputBytes) {
      return { text: sanitized, truncated: false };
    }

    const truncatedText = buffer.subarray(0, this.maxOutputBytes).toString('utf-8');
    return {
      text: `${truncatedText}\n... [OUTPUT TRUNCATED: Exceeded ${this.maxOutputBytes} bytes limit]`,
      truncated: true,
    };
  }

  /**
   * Records a granular execution event.
   */
  async logEvent(
    executionId: string,
    eventType: string,
    message: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const sanitizedMessage = this.sanitizeSecrets(message);

    await this.prisma.executionEvent.create({
      data: {
        executionId,
        eventType,
        message: sanitizedMessage,
        payload: (payload as unknown as Prisma.InputJsonValue) ?? {},
      },
    });
  }

  /**
   * Updates an execution record with final status, output, and duration.
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    output?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const data: Prisma.ExecutionUpdateInput = {
      status,
      completedAt: new Date(),
    };

    if (output) {
      data.output = output as unknown as Prisma.InputJsonValue;
    }

    if (error) {
      data.error = this.sanitizeSecrets(error);
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data,
    });
  }
}
