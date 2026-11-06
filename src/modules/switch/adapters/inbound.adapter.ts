import type { SwitchConnectionManager } from '../switch.connection.js';
import type { SwitchEventProcessor, EventProcessingResult } from '../switch.events.js';
import type { SwitchEventFrame } from '../switch.types.js';

export class SwitchInboundAdapter {
  constructor(
    private readonly connectionManager: SwitchConnectionManager,
    private readonly processor: SwitchEventProcessor,
  ) {
    this.connectionManager.on('frame', (frame: SwitchEventFrame) => {
      void this.handleIncomingFrame(frame);
    });
  }

  async handleIncomingFrame(frame: SwitchEventFrame): Promise<EventProcessingResult> {
    return this.processor.processFrame(frame);
  }
}
