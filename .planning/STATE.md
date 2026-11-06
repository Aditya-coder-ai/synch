# CrewFlow Project State

## Active Milestone: Milestone 1 - Platform Foundation & Core Services
## Completed Phase: Phase 3 - Switch Integration
**Status**: Completed, Tested, and Documented
**Last Updated**: 2026-11-06

### Key Decisions Made in Phase 3
1. **Official Switch Protocol Compliance**: Queried live documentation from `https://docs.switchagents.ai/mcp`. Built client around the wire contract: WebSocket connection at `/agents/{agent_id}/connection/ws` with Bearer auth, periodic pings, and outbound messaging via `/agents/{agent_id}/message`.
2. **Safe Inbound Pipeline**: Implemented strict validation, participant resolution (`@switch-user-*` -> `HUMAN`, `@switch-agent-*` -> `AGENT`, `@switch-admin` -> `SYSTEM`), echo-loop prevention, and idempotent deduplication.
3. **Database Safeguards**:
   - Added `externalMessageId` unique constraint on `Message`.
   - Created `SwitchEventLog` table for tracking event status (`PROCESSED`, `DUPLICATE`, `UNMAPPED_ROOM`, `ERROR`).
   - Unmapped rooms trigger a diagnostic log entry rather than attaching to an arbitrary project.
4. **Resilient Connection Lifecycle**:
   - Connection manager tracks state (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `RECONNECTING`, `ERROR`).
   - Exponential backoff with jitter prevents thundering herd.
   - Clean shutdown with `onClose` hook prevents hanging socket or streams.
5. **Architectural Isolation**:
   - Kept Switch-specific wire protocol isolated from CrewFlow business logic.
   - Maintained strict distinction between CrewFlow backend (platform bridge) and future OpenCode execution provider.
