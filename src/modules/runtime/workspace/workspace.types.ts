export interface WorkspacePathValidation {
  valid: boolean;
  normalizedPath: string;
  error?: string;
}

export interface ProjectWorkspace {
  projectId: string;
  workspacePath: string;
  createdAt: string;
}

