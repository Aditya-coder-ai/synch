import { describe, it, expect } from 'vitest';
import { parseRuntimeConfig } from '../../src/modules/runtime/runtime.config.js';

describe('Runtime Configuration', () => {
  it('should load default MOCK provider configuration', () => {
    const config = parseRuntimeConfig({});
    expect(config.provider).toBe('MOCK');
    expect(config.baseUrl).toBe('http://127.0.0.1:4096');
    expect(config.username).toBe('opencode');
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxOutputBytes).toBe(65536);
  });

  it('should accept custom OpenCode overrides', () => {
    const config = parseRuntimeConfig({
      provider: 'OPENCODE',
      baseUrl: 'http://localhost:5000',
      username: 'custom_user',
      password: 'secret_password_123',
      timeoutMs: 45000,
      autoApprove: true,
      maxOutputBytes: 131072,
    });

    expect(config.provider).toBe('OPENCODE');
    expect(config.baseUrl).toBe('http://localhost:5000');
    expect(config.username).toBe('custom_user');
    expect(config.password).toBe('secret_password_123');
    expect(config.timeoutMs).toBe(45000);
    expect(config.autoApprove).toBe(true);
    expect(config.maxOutputBytes).toBe(131072);
  });

  it('should reject invalid timeout values', () => {
    expect(() =>
      parseRuntimeConfig({
        timeoutMs: 50, // min is 1000ms
      }),
    ).toThrow();
  });
});
