import { z } from 'zod';
import crypto from 'node:crypto';
import { SwitchDefaults, SwitchTransportType } from './switch.constants.js';

export const switchConfigSchema = z
  .object({
    enabled: z.coerce.boolean().default(false),
    baseUrl: z
      .string()
      .trim()
      .url('SWITCH_BASE_URL must be a valid URL')
      .default('http://localhost:8080'),
    agentId: z.string().trim().default(''),
    apiKey: z.string().trim().default(''),
    connectionId: z.string().trim().uuid().default(() => crypto.randomUUID()),
    transport: z
      .enum([SwitchTransportType.WEBSOCKET, SwitchTransportType.SSE])
      .default(SwitchTransportType.WEBSOCKET),
    connectionTimeoutMs: z.coerce
      .number()
      .int()
      .positive()
      .default(SwitchDefaults.CONNECTION_TIMEOUT_MS),
    reconnectMaxAttempts: z.coerce
      .number()
      .int()
      .min(0)
      .default(SwitchDefaults.RECONNECT_MAX_ATTEMPTS),
    filter: z.enum(['all', 'addressed']).default('all'),
    scope: z.enum(['all', 'single']).default('all'),
  })
  .refine(
    config => {
      // If enabled, agentId and apiKey are required
      if (config.enabled) {
        return Boolean(config.agentId && config.apiKey);
      }
      return true;
    },
    {
      message: 'SWITCH_AGENT_ID and SWITCH_API_KEY are required when SWITCH_ENABLED=true',
      path: ['agentId'],
    },
  );

export type SwitchConfig = z.infer<typeof switchConfigSchema>;

export function parseSwitchConfig(envObj: Record<string, unknown> = process.env): SwitchConfig {
  return switchConfigSchema.parse({
    enabled: envObj.SWITCH_ENABLED,
    baseUrl: envObj.SWITCH_BASE_URL || 'http://localhost:8080',
    agentId: envObj.SWITCH_AGENT_ID || '',
    apiKey: envObj.SWITCH_API_KEY || '',
    connectionId: envObj.SWITCH_CONNECTION_ID || undefined,
    transport: envObj.SWITCH_TRANSPORT || SwitchTransportType.WEBSOCKET,
    connectionTimeoutMs: envObj.SWITCH_CONNECTION_TIMEOUT_MS,
    reconnectMaxAttempts: envObj.SWITCH_RECONNECT_MAX_ATTEMPTS,
    filter: envObj.SWITCH_ROOM_FILTER || 'all',
    scope: envObj.SWITCH_ROOM_SCOPE || 'all',
  });
}
