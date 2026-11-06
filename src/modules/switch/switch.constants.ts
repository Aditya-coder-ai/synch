export const SwitchConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR',
} as const;
export type SwitchConnectionState =
  (typeof SwitchConnectionState)[keyof typeof SwitchConnectionState];

export const SwitchTransportType = {
  WEBSOCKET: 'WEBSOCKET',
  SSE: 'SSE',
} as const;
export type SwitchTransportType =
  (typeof SwitchTransportType)[keyof typeof SwitchTransportType];

export const SwitchEventType = {
  MESSAGE: 'message',
  COMMAND: 'command',
  ROOM_JOIN: 'room_join',
  CONNECTION_STATE: 'connection_state',
  GAP: 'gap',
  EVICTED: 'evicted',
  SUBSCRIPTION_CHANGED: 'subscription_changed',
} as const;
export type SwitchEventType =
  (typeof SwitchEventType)[keyof typeof SwitchEventType];

export const SwitchParticipantPrefix = {
  USER: 'switch-user-',
  AGENT: 'switch-agent-',
  ADMIN: 'switch-admin',
  BRIDGE: 'switch-bridge',
} as const;

export const SwitchDefaults = {
  CONNECTION_TIMEOUT_MS: 10000,
  HEARTBEAT_INTERVAL_MS: 2000,
  HEARTBEAT_TTL_MS: 6000,
  RECONNECT_INITIAL_DELAY_MS: 1000,
  RECONNECT_MAX_DELAY_MS: 30000,
  RECONNECT_MAX_ATTEMPTS: 10,
  RECONNECT_JITTER_RATIO: 0.25,
} as const;

