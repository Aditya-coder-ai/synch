import type { MessageSenderType } from '../../database/types.js';
import type { SwitchConnectionState, SwitchTransportType } from './switch.constants.js';

export interface SwitchAttachment {
  filename: string;
  mimetype: string;
  size: number;
  mxc: string;
  msgtype: string;
}

export interface SwitchMessagePayload {
  addressed: boolean;
  sender: string;
  sender_name: string;
  message_id: string;
  body: string;
  timestamp: number; // millisecond unix timestamp
  thread_id?: string | null;
  attachments?: SwitchAttachment[];
}

export interface SwitchCommandPayload {
  command: string;
  args: string;
  user_id: string;
  user_name: string;
  thread_id?: string | null;
}

export interface SwitchRoomJoinPayload {
  member: string;
  member_name: string;
  timestamp: number;
  listening: boolean;
}

export interface SwitchConnectionStatePayload {
  connection_id: string;
  generation?: number;
  server_time?: number;
}

export interface SwitchEventFrame {
  id?: number; // event buffer sequence number
  event: string; // "message" | "command" | "room_join" | "connection_state" | etc.
  room_id?: string;
  payload: unknown;
}

/**
 * Clean internal normalized event format within CrewFlow.
 */
export interface NormalizedSwitchEvent {
  eventId: string;
  roomId: string;
  senderId: string;
  senderType: MessageSenderType;
  senderName: string;
  content: string;
  timestamp: Date;
  eventType: string;
  threadId?: string | null;
  metadata: Record<string, unknown>;
}

export interface SwitchOutboundMessageInput {
  roomId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SwitchOutboundResult {
  success: boolean;
  messageId?: string;
  deliveredAt: Date;
  roomId: string;
}

export interface SwitchIntegrationStatus {
  enabled: boolean;
  connectionState: SwitchConnectionState;
  transport: SwitchTransportType;
  agentId: string;
  connectionId: string;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastReceivedAt: string | null;
  lastSentAt: string | null;
  lastError: string | null;
  reconnectAttempts: number;
}

