-- ==============================================================================
-- CrewFlow Phase 4 Migration: Add Orchestration Engine Models & Relations
-- ==============================================================================

-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('CREATED', 'PLANNING', 'PLAN_READY', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable: Link Tasks to an originating Orchestration
ALTER TABLE "Task" ADD COLUMN "orchestrationId" TEXT;

-- CreateTable: Orchestration Sessions
CREATE TABLE "Orchestration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "initiatorUserId" TEXT,
    "conversationId" TEXT,
    "status" "OrchestrationStatus" NOT NULL DEFAULT 'CREATED',
    "objective" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "plan" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orchestration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Orchestration Events Audit Trail
CREATE TABLE "OrchestrationEvent" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes for Task orchestration linkage
CREATE INDEX "Task_orchestrationId_idx" ON "Task"("orchestrationId");

-- Indexes for Orchestration query performance
CREATE INDEX "Orchestration_projectId_status_idx" ON "Orchestration"("projectId", "status");
CREATE INDEX "Orchestration_conversationId_idx" ON "Orchestration"("conversationId");
CREATE INDEX "Orchestration_initiatorUserId_idx" ON "Orchestration"("initiatorUserId");
CREATE INDEX "Orchestration_createdAt_idx" ON "Orchestration"("createdAt");

-- Indexes for OrchestrationEvent ordering and querying
CREATE INDEX "OrchestrationEvent_orchestrationId_createdAt_idx" ON "OrchestrationEvent"("orchestrationId", "createdAt");
CREATE INDEX "OrchestrationEvent_eventType_idx" ON "OrchestrationEvent"("eventType");

-- Foreign Keys
ALTER TABLE "Task" ADD CONSTRAINT "Task_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Orchestration" ADD CONSTRAINT "Orchestration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Orchestration" ADD CONSTRAINT "Orchestration_initiatorUserId_fkey" FOREIGN KEY ("initiatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Orchestration" ADD CONSTRAINT "Orchestration_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrchestrationEvent" ADD CONSTRAINT "OrchestrationEvent_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
