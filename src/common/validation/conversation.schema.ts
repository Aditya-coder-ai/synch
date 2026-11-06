import { z } from 'zod';
import { MessageSenderType } from '../../database/types.js';

export const messageSenderTypeSchema = z.enum([
  MessageSenderType.HUMAN,
  MessageSenderType.AGENT,
  MessageSenderType.SYSTEM,
]);

export const createConversationSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  title: z.string().trim().min(1, 'Conversation title is required').max(200),
  externalRoomId: z.string().trim().max(100).optional().nullable(),
  source: z.string().trim().max(50).default('internal'),
});

export const createMessageSchema = z.object({
  conversationId: z.string().trim().min(1, 'Conversation ID is required'),
  senderType: messageSenderTypeSchema,
  senderId: z.string().trim().max(100).optional().nullable(),
  content: z.string().trim().min(1, 'Message content cannot be empty').max(20000),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

