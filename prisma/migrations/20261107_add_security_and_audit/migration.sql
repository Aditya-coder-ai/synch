-- ==============================================================================
-- CrewFlow Phase 7 Migration: Human Approval, Permission Engine & Security Audit
-- ==============================================================================

-- AlterTable: Approval enhancements for cryptographic binding, risk level, and expiration
ALTER TABLE "Approval" ADD COLUMN "actionCategory" TEXT NOT NULL DEFAULT 'COMMAND_EXECUTE';
ALTER TABLE "Approval" ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'L2';
ALTER TABLE "Approval" ADD COLUMN "actionDigest" TEXT;
ALTER TABLE "Approval" ADD COLUMN "decisionReason" TEXT;
ALTER TABLE "Approval" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex: Index for querying pending/active approvals by expiration
CREATE INDEX "Approval_projectId_status_expiresAt_idx" ON "Approval"("projectId", "status", "expiresAt");

-- CreateTable: Security Audit Log (Append-only trail)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "workspaceId" TEXT,
    "projectId" TEXT,
    "actionCategory" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'L0',
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Foreign Key: Link AuditLog to Project
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for AuditLog query performance and filtering
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_actionCategory_idx" ON "AuditLog"("actionCategory");
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
