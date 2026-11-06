-- AlterTable
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_externalRoomId_unique" UNIQUE ("externalRoomId");

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "externalMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Message_externalMessageId_key" ON "Message"("externalMessageId");
CREATE INDEX "Message_externalMessageId_idx" ON "Message"("externalMessageId");

-- CreateTable
CREATE TABLE "SwitchEventLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "SwitchEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwitchEventLog_eventId_key" ON "SwitchEventLog"("eventId");
CREATE INDEX "SwitchEventLog_roomId_eventId_idx" ON "SwitchEventLog"("roomId", "eventId");
CREATE INDEX "SwitchEventLog_processedAt_idx" ON "SwitchEventLog"("processedAt");
