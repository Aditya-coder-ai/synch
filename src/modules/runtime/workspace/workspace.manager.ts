import fs from 'node:fs/promises';
import path from 'node:path';
import { WorkspaceSecurity } from './workspace.security.js';
import type { ProjectWorkspace } from './workspace.types.js';
import { WorkspaceSecurityError } from '../opencode/opencode.errors.js';

export interface WorkspaceManagerOptions {
  baseWorkspaceRoot: string;
}

export class WorkspaceManager {
  private readonly baseRoot: string;
  private readonly writeLocks = new Set<string>();

  constructor(options: WorkspaceManagerOptions) {
    this.baseRoot = path.resolve(options.baseWorkspaceRoot);
  }

  /**
   * Resolves and initializes an isolated workspace folder for a project.
   */
  async getProjectWorkspace(projectId: string): Promise<ProjectWorkspace> {
    if (!projectId || !/^[a-zA-Z0-9_-]+$/.test(projectId)) {
      throw new WorkspaceSecurityError(`Invalid project ID format for workspace: '${projectId}'`);
    }

    const projectDir = path.join(this.baseRoot, 'projects', projectId);
    const safePath = WorkspaceSecurity.assertSafePath(this.baseRoot, projectDir);

    await fs.mkdir(safePath, { recursive: true });

    return {
      projectId,
      workspacePath: safePath,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Acquires a write lock for a project workspace to prevent simultaneous conflicting mutations.
   */
  async acquireWriteLock(projectId: string, timeoutMs: number = 10000): Promise<() => void> {
    const startTime = Date.now();

    while (this.writeLocks.has(projectId)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new WorkspaceSecurityError(
          `Timeout waiting for workspace write lock on project '${projectId}'`,
        );
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.writeLocks.add(projectId);

    let released = false;
    return () => {
      if (!released) {
        this.writeLocks.delete(projectId);
        released = true;
      }
    };
  }

  /**
   * Verifies if a project workspace currently has an active write lock.
   */
  isLocked(projectId: string): boolean {
    return this.writeLocks.has(projectId);
  }

  /**
   * Resolves an approved relative path inside a project workspace.
   */
  resolvePathInProject(projectWorkspacePath: string, relativePath: string): string {
    return WorkspaceSecurity.assertSafePath(projectWorkspacePath, relativePath);
  }
}

