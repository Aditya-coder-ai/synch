import { z } from 'zod';
import { SwitchEventType } from './switch.constants.js';

export const switchAttachmentSchema = z.object({
  filename: z.string().default('attachment'),
  mimetype: z.string().default('application/octet-stream'),
  size: z.number().int().nonnegative().default(0),
  mxc: z.string().default(''),
  msgtype: z.string().default('m.file'),
});

export const switchMessagePayloadSchema = z.object({
  addressed: z.boolean().default(false),
  sender: z.string().min(1, 'Sender participant id is required'),
  sender_name: z.string().default('Unknown'),
  message_id: z.string().min(1, 'Message ID is required'),
  body: z.string().default(''),
  timestamp: z.number().int().positive().default(() => Date.now()),
  thread_id: z.string().nullable().optional(),
  attachments: z.array(switchAttachmentSchema).optional().default([]),
});

export const switchCommandPayloadSchema = z.object({
  command: z.string().min(1, 'Command name is required'),
  args: z.string().default(''),
  user_id: z.string().default(''),
  user_name: z.string().default(''),
  thread_id: z.string().nullable().optional(),
});

export const switchRoomJoinPayloadSchema = z.object({
  member: z.string().min(1, 'Member ID is required'),
  member_name: z.string().default('Unknown'),
  timestamp: z.number().default(() => Date.now()),
  listening: z.boolean().default(false),
});

export const switchEventFrameSchema = z.object({
  id: z.number().int().optional(), // sequence number
  event: z.string().min(1, 'Event type is required'),
  room_id: z.string().optional(),
  payload: z.unknown(),
});

export const outboundMessageInputSchema = z.object({
  roomId: z.string().trim().min(1, 'Room ID is required').max(200),
  content: z.string().trim().min(1, 'Content cannot be empty').max(20000),
  metadata: z.record(z.unknown()).default({}),
});

export const mapRoomInputSchema = z.object({
  roomId: z.string().trim().min(1, 'Switch Room ID is required'),
  conversationId: z.string().trim().min(1, 'Conversation ID is required'),
});

export const switchStatusResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    enabled: z.boolean(),
    connectionState: z.string(),
    transport: z.string(),
    agentId: z.string(),
    connectionId: z.string(),
    lastConnectedAt: z.string().nullable(),
    lastDisconnectedAt: z.string().nullable(),
    lastReceivedAt: z.string().nullable(),
    lastSentAt: z.string().nullable(),
    lastError: z.string().nullable(),
    reconnectAttempts: z.number(),
  }),
});
