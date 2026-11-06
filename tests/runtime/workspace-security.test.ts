import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { WorkspaceSecurity } from '../../src/modules/runtime/workspace/workspace.security.js';
import { WorkspaceSecurityError } from '../../src/modules/runtime/opencode/opencode.errors.js';

describe('Workspace Security & Path Traversal Guard', () => {
  const root = path.resolve('./test-workspaces/proj_100');

  it('should accept safe relative paths within workspace root', () => {
    const result = WorkspaceSecurity.validatePath(root, 'src/index.ts');
    expect(result.valid).toBe(true);
    expect(result.normalizedPath).toBe(path.join(root, 'src/index.ts'));
  });

  it('should reject relative path traversal escape attempts with ..', () => {
    const result = WorkspaceSecurity.validatePath(root, '../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Path traversal detected');
  });

  it('should reject absolute paths outside approved workspace root', () => {
    const outsidePath = path.resolve('C:/Windows/System32/drivers/etc/hosts');
    const result = WorkspaceSecurity.validatePath(root, outsidePath);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Path traversal detected');
  });

  it('should reject paths containing null bytes', () => {
    const result = WorkspaceSecurity.validatePath(root, 'safe-file\0.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('null byte');
  });

  it('should assert safe path and throw WorkspaceSecurityError on breach', () => {
    expect(() =>
      WorkspaceSecurity.assertSafePath(root, '../../../outside.txt'),
    ).toThrow(WorkspaceSecurityError);
  });

  it('should identify sensitive secret files', () => {
    expect(WorkspaceSecurity.isSensitiveFile('.env')).toBe(true);
    expect(WorkspaceSecurity.isSensitiveFile('.env.production')).toBe(true);
    expect(WorkspaceSecurity.isSensitiveFile('credentials.json')).toBe(true);
    expect(WorkspaceSecurity.isSensitiveFile('server.key')).toBe(true);
    expect(WorkspaceSecurity.isSensitiveFile('id_rsa')).toBe(true);

    expect(WorkspaceSecurity.isSensitiveFile('index.ts')).toBe(false);
    expect(WorkspaceSecurity.isSensitiveFile('package.json')).toBe(false);
  });
});
