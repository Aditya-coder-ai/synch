import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Prisma Schema Definition & Migration Verification', () => {
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const migrationPath = path.resolve(
    process.cwd(),
    'prisma/migrations/20261106_init_phase2_models/migration.sql',
  );

  it('should have prisma/schema.prisma existing and readable', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('should define all 14 required Phase 2 models in schema.prisma', () => {
    const content = fs.readFileSync(schemaPath, 'utf8');

    const expectedModels = [
      'model User',
      'model Workspace',
      'model WorkspaceMember',
      'model Project',
      'model Task',
      'model TaskDependency',
      'model Agent',
      'model Conversation',
      'model Message',
      'model Decision',
      'model Approval',
      'model Execution',
      'model ExecutionEvent',
      'model MemoryEntry',
    ];

    for (const model of expectedModels) {
      expect(content).toContain(model);
    }
  });

  it('should define all required enums in schema.prisma', () => {
    const content = fs.readFileSync(schemaPath, 'utf8');

    const expectedEnums = [
      'enum WorkspaceRole',
      'enum ProjectStatus',
      'enum TaskStatus',
      'enum TaskPriority',
      'enum AgentRole',
      'enum AgentStatus',
      'enum MessageSenderType',
      'enum ApprovalStatus',
      'enum ExecutionStatus',
      'enum MemoryCategory',
    ];

    for (const enm of expectedEnums) {
      expect(content).toContain(enm);
    }
  });

  it('should define composite indexes and unique constraints in schema.prisma', () => {
    const content = fs.readFileSync(schemaPath, 'utf8');

    expect(content).toContain('@@unique([workspaceId, userId])');
    expect(content).toContain('@@unique([taskId, dependsOnTaskId])');
    expect(content).toContain('@@index([projectId, status])');
    expect(content).toContain('@@index([workspaceId, status])');
    expect(content).toContain('@@index([conversationId, createdAt])');
    expect(content).toContain('@@index([executionId, createdAt])');
  });

  it('should have migration.sql generated for Supabase PostgreSQL', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TYPE "WorkspaceRole"');
    expect(sql).toContain('CREATE TYPE "TaskStatus"');
    expect(sql).toContain('CREATE TABLE "Workspace"');
    expect(sql).toContain('CREATE TABLE "Task"');
    expect(sql).toContain('CREATE TABLE "TaskDependency"');
    expect(sql).toContain('Task_single_assignee_check');
    expect(sql).toContain('TaskDependency_no_self_dependency_check');
  });
});

