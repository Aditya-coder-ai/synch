import { AppError } from '../../common/errors/app-error.js';

export class SwitchError extends AppError {
  constructor(message: string, statusCode = 500, code = 'SWITCH_ERROR', details?: unknown) {
    super(message, statusCode, code, details);
    this.name = 'SwitchError';
  }
}

export class SwitchConnectionError extends SwitchError {
  constructor(message: string, details?: unknown) {
    super(message, 503, 'SWITCH_CONNECTION_ERROR', details);
    this.name = 'SwitchConnectionError';
  }
}

export class SwitchAuthError extends SwitchError {
  constructor(message = 'Invalid Switch authentication credentials', details?: unknown) {
    super(message, 401, 'SWITCH_AUTH_ERROR', details);
    this.name = 'SwitchAuthError';
  }
}

export class SwitchProtocolError extends SwitchError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'SWITCH_PROTOCOL_ERROR', details);
    this.name = 'SwitchProtocolError';
  }
}

export class SwitchRoomNotFoundError extends SwitchError {
  constructor(roomId: string) {
    super(`Switch room '${roomId}' not found`, 404, 'SWITCH_ROOM_NOT_FOUND', { roomId });
    this.name = 'SwitchRoomNotFoundError';
  }
}

export class SwitchUnmappedRoomError extends SwitchError {
  constructor(roomId: string) {
    super(
      `Switch room '${roomId}' is not mapped to any active CrewFlow project conversation`,
      422,
      'SWITCH_UNMAPPED_ROOM',
      { roomId },
    );
    this.name = 'SwitchUnmappedRoomError';
  }
}

export class SwitchDuplicateEventError extends SwitchError {
  constructor(eventId: string) {
    super(
      `Switch event '${eventId}' has already been processed`,
      409,
      'SWITCH_DUPLICATE_EVENT',
      { eventId },
    );
    this.name = 'SwitchDuplicateEventError';
  }
}
