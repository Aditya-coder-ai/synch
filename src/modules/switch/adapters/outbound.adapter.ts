import type { SwitchClient } from '../switch.client.js';
import type { SwitchRepository } from '../switch.repository.js';
import type {
  SwitchOutboundMessageInput,
  SwitchOutboundResult,
} from '../switch.types.js';
import { SwitchUnmappedRoomError } from '../switch.errors.js';

export class SwitchOutboundAdapter {
  constructor(
    private readonly client: SwitchClient,
    private readonly repository: SwitchRepository,
  ) {}

  /**
   * Dispatches an outbound message to a Switch room and persists the record.
   */
  async sendMessage(input: SwitchOutboundMessageInput): Promise<SwitchOutboundResult> {
    const { roomId, content, metadata = {} } = input;

    // Validate that the room is mapped in CrewFlow
    const conversation = await this.repository.findConversationByRoomId(roomId);
    if (!conversation) {
      throw new SwitchUnmappedRoomError(roomId);
    }

    // Deliver via Switch client (POST /agents/{agent_id}/message)
    const result = await this.client.postMessage(roomId, content);

    // Persist outbound message in database for audit trail
    await this.repository.createOutboundMessage(conversation.id, content, {
      ...metadata,
      deliveredAt: result.deliveredAt,
      externalMessageId: result.messageId,
      switchRoomId: roomId,
    });

    return result;
  }
}

