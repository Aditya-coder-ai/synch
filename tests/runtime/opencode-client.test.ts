import { describe, it, expect, vi } from 'vitest';
import { OpenCodeClient } from '../../src/modules/runtime/opencode/opencode.client.js';
import { parseRuntimeConfig } from '../../src/modules/runtime/runtime.config.js';
import {
  OpenCodeConnectionError,
  OpenCodeTimeoutError,
  OpenCodeUnavailableError,
} from '../../src/modules/runtime/opencode/opencode.errors.js';

describe('OpenCodeClient', () => {
  it('should successfully check server health and version', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ healthy: true, version: '1.19.5' }),
    });

    const client = new OpenCodeClient({
      config: parseRuntimeConfig({ baseUrl: 'http://127.0.0.1:4096' }),
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const health = await client.checkHealth();
    expect(health.healthy).toBe(true);
    expect(health.version).toBe('1.19.5');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4096/global/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('should attach HTTP Basic Auth header when password is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'ses_123', title: 'Test Session' }),
    });

    const client = new OpenCodeClient({
      config: parseRuntimeConfig({
        username: 'admin',
        password: 'supersecretpassword',
      }),
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await client.createSession({ title: 'Test Session' });

    expect(mockFetch).toHaveBeenCalled();
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe(
      `Basic ${Buffer.from('admin:supersecretpassword').toString('base64')}`,
    );
  });

  it('should wrap network connection failure in OpenCodeUnavailableError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new OpenCodeClient({
      config: parseRuntimeConfig({ baseUrl: 'http://127.0.0.1:9999' }),
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.checkHealth()).rejects.toThrow(OpenCodeUnavailableError);
  });

  it('should wrap AbortError into OpenCodeTimeoutError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    const mockFetch = vi.fn().mockRejectedValue(abortError);

    const client = new OpenCodeClient({
      config: parseRuntimeConfig({ timeoutMs: 1500 }),
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.checkHealth()).rejects.toThrow(OpenCodeTimeoutError);
  });

  it('should handle HTTP error status from OpenCode server', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal OpenCode crash',
    });

    const client = new OpenCodeClient({
      config: parseRuntimeConfig(),
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getSession('ses_invalid')).rejects.toThrow(OpenCodeConnectionError);
  });
});

