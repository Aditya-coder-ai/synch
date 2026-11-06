import { describe, it, expect } from 'vitest';
import { parseSwitchConfig, switchConfigSchema } from '../../src/modules/switch/switch.config.js';
import { SwitchTransportType } from '../../src/modules/switch/switch.constants.js';

describe('Switch Configuration Validation', () => {
  it('should parse defaults when SWITCH_ENABLED is false', () => {
    const config = parseSwitchConfig({
      SWITCH_ENABLED: 'false',
    });

    expect(config.enabled).toBe(false);
    expect(config.baseUrl).toBe('http://localhost:8080');
    expect(config.transport).toBe(SwitchTransportType.WEBSOCKET);
    expect(config.connectionTimeoutMs).toBe(10000);
    expect(config.reconnectMaxAttempts).toBe(10);
    expect(config.connectionId).toBeDefined();
  });

  it('should require agentId and apiKey when SWITCH_ENABLED is true', () => {
    expect(() =>
      switchConfigSchema.parse({
        enabled: true,
        baseUrl: 'http://localhost:8080',
        agentId: '',
        apiKey: '',
      }),
    ).toThrowError(/SWITCH_AGENT_ID and SWITCH_API_KEY are required/);
  });

  it('should accept valid configuration when enabled', () => {
    const config = switchConfigSchema.parse({
      enabled: true,
      baseUrl: 'https://switch.internal.company.com',
      agentId: 'agent_coord_01',
      apiKey: 'sw_live_sec_12345',
      connectionId: '12345678-1234-1234-1234-123456789abc',
      transport: SwitchTransportType.WEBSOCKET,
      connectionTimeoutMs: 5000,
    });

    expect(config.enabled).toBe(true);
    expect(config.agentId).toBe('agent_coord_01');
    expect(config.apiKey).toBe('sw_live_sec_12345');
    expect(config.connectionTimeoutMs).toBe(5000);
  });

  it('should reject invalid baseUrl', () => {
    expect(() =>
      switchConfigSchema.parse({
        enabled: false,
        baseUrl: 'not-a-valid-url',
      }),
    ).toThrowError(/SWITCH_BASE_URL must be a valid URL/);
  });
});
