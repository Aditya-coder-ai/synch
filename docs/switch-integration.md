# CrewFlow — Switch Agent Protocol Integration (Phase 3)

This technical specification details the integration between **CrewFlow** and **Switch** (`switchagents.ai`), the team communication infrastructure connecting humans, specialist agents, and execution runtimes.

---

## 1. Architectural Role & Distinction

It is critical to distinguish between two separate responsibilities in CrewFlow's multi-agent architecture:

```
┌────────────────────────────────────────────────────────┐
│                   SWITCH ROOM                          │
│     (Slack, Microsoft Teams, Web Client)               │
└───────────────────────┬────────────────────────────────┘
                        │ Switch Agent Protocol
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ CrewFlow Backend │          │ OpenCode Runtime │
│ (This Phase)     │          │ (Future Phase)   │
└──────────────────┘          └──────────────────┘
  • Platform Bridge             • Agent Provider
  • Context & DB Sync           • Sandbox Code Execution
  • Human Approvals Gate        • Tool & Bash Runtime
```

1. **CrewFlow Backend Connected to Switch (Phase 3)**:
   - Connects as an autonomous platform bridge.
   - Listens to room conversations via WebSocket stream.
   - Normalizes messages, maps them to CrewFlow Projects & Conversations, and stores them in PostgreSQL.
   - Deduplicates incoming events and prevents message echo loops.
   - Dispatches platform notifications and human approval requests back to the room.

2. **OpenCode Connected to Switch as an Agent Provider (Phase 4/5)**:
   - Runs as a headless coding execution sandbox.
   - Receives code execution tasks delegated by CrewFlow's Coordinator Agent.
   - Communicates through tool invocations, isolated containers, and terminal runtimes.

---

## 2. Switch Agent Protocol Specifications

*(Derived directly from the official Switch Agent Protocol documentation at `https://docs.switchagents.ai/mcp`)*

### 2.1 Connection & Wire Transport
- **Base URL**: The Switch server address (e.g., `http://localhost:8080`).
- **Probe Endpoint**: `GET /health` is public on the bridge and serves as the connectivity check.
- **Authentication**: `Authorization: Bearer <agent_api_key>` for all HTTP operations and WebSocket upgrades.
- **WebSocket Route**:
  ```http
  GET /agents/{agent_id}/connection/ws?connection_id=<uuid>&scope=all&filter=all&start_from=head
  Authorization: Bearer <agent_api_key>
  Upgrade: websocket
  ```
- **Connection Identifiers**:
  - `connection_id`: A UUID generated once by the client and reused across reconnects.
  - `start_from`: Sequence offset (`head` or integer sequence number) to resume without message loss.
- **Heartbeats**:
  - The Switch server issues periodic `ping` frames every 2 seconds.
  - The client answers with `{ type: "pong", cursor: <last_sequence_id> }`.
- **Fallback Transport**:
  - Server-Sent Events (SSE) at `GET /agents/{agent_id}/events` with `Accept: text/event-stream` and periodic POST to `/agents/{agent_id}/connection/beat`.

### 2.2 Wire Frame & Event Catalog
Every event frame delivers:
```json
{
  "id": 4812,
  "event": "message",
  "room_id": "!room_xyz:switch",
  "payload": {
    "addressed": true,
    "sender": "@switch-user-aditya:switch",
    "sender_name": "Aditya",
    "message_id": "m_102030",
    "body": "Start project kickoff",
    "timestamp": 1730900000000,
    "thread_id": null,
    "attachments": []
  }
}
```

#### Event Kinds:
- **`message`**: Chat message posted in room. Includes `addressed` boolean (tested by `addressed` filter), `sender`, `body`, `message_id`, and `attachments`.
- **`command`**: User issued slash commands like `!reset` or `!compact`.
- **`room_join`**: Participant entered room (`listening` boolean indicates if active).
- **Control Frames**: `connection_state` (delivers generation and server time), `gap` (sequence expired), `evicted`, `subscription_changed`.

### 2.3 Sender Participant IDs
Switch formats participants as `@<localpart>:<server>`:
- `@switch-user-<id>:<server>` → Human user (e.g., in Slack or Teams).
- `@switch-agent-<id>:<server>` → Specialist AI Agent.
- `@switch-admin:<server>` or `@switch-bridge:<server>` → Switch system messages.

### 2.4 Outbound Messaging API
- **Endpoint**:
  ```http
  POST /agents/{agent_id}/message
  Authorization: Bearer <agent_api_key>
  Content-Type: application/json

  {
    "room_id": "!room_xyz:switch",
    "content": "Approval requested: Proceed with deployment to production?"
  }
  ```
- *Note*: This endpoint does not require an active WebSocket connection, enabling reliable out-of-band delivery.

---

## 3. Inbound Processing Pipeline

```
Switch WebSocket ──► Inbound Adapter ──► Event Processor
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                        Is Echo / Self?               Is Duplicate?
                         (Drop safely)            (Checked in EventLog)
                                                             │ No
                                                             ▼
                                                    Lookup Room Mapping
                                               (Conversation.externalRoomId)
                                                             │
                                        ┌────────────────────┴────────────────────┐
                                        ▼                                         ▼
                                   Mapped Room                             Unmapped Room
                          (Persist Message in DB)                 (Log Diagnostic Event, no guess)
```

1. **Echo-Loop Prevention**: Ignores messages sent by the local agent or containing `origin: crewflow_outbound`.
2. **Deduplication**: Checks `SwitchEventLog` and enforces `Message.externalMessageId` unique constraint.
3. **Room Mapping**: Matches `room_id` against `Conversation.externalRoomId`.
4. **Safe Diagnostic Log**: If unmapped, records a structured entry in `SwitchEventLog` with status `UNMAPPED_ROOM` rather than guessing an arbitrary project.

---

## 4. Configuration Variables

Add the following to your `.env` file:

| Variable | Type | Default | Description |
|---|---|---|---|
| `SWITCH_ENABLED` | `boolean` | `false` | Enable or disable the Switch background connection |
| `SWITCH_BASE_URL` | `string` | `http://localhost:8080` | Switch server bridge base URL |
| `SWITCH_AGENT_ID` | `string` | `""` | Registered agent identifier in Switch |
| `SWITCH_API_KEY` | `string` | `""` | Bearer API token for the registered agent |
| `SWITCH_CONNECTION_ID` | `string` | *(auto UUID)* | Persistent client connection identifier |
| `SWITCH_TRANSPORT` | `enum` | `WEBSOCKET` | Inbound transport (`WEBSOCKET` or `SSE`) |
| `SWITCH_CONNECTION_TIMEOUT_MS` | `number` | `10000` | Network request timeout in milliseconds |
| `SWITCH_RECONNECT_MAX_ATTEMPTS` | `number` | `10` | Maximum reconnection retry attempts |
| `SWITCH_ROOM_FILTER` | `enum` | `all` | Room event filter (`all` or `addressed`) |
| `SWITCH_ROOM_SCOPE` | `enum` | `all` | Room scope (`all` or `single`) |

---

## 5. Switch Console & Local Setup Guide

Switch is open-source at [`sandbox-quantum/switch`](https://github.com/sandbox-quantum/switch) and operates as a coordinated multi-container stack (Switch Core, PostgreSQL, and messaging bridges like Mattermost or Slack) managed via Docker Compose. There is no single standalone `switchagents/server:latest` image on Docker Hub.

### Running Switch Locally via Docker Compose

1. **Clone the Switch repository in a separate directory**:
   ```bash
   git clone https://github.com/sandbox-quantum/switch.git
   cd switch
   ```

2. **Initialize configuration and start the stack**:
   If using the `just` task runner:
   ```bash
   just init-env
   just standalone-up
   ```
   Or directly with Docker Compose:
   ```bash
   docker compose -f docker-compose.standalone.yml up -d
   ```

3. **Verify Switch Bridge Connectivity**:
   ```bash
   curl http://localhost:8080/health
   ```

2. **Register CrewFlow Platform Agent**:
   ```bash
   curl -X POST http://localhost:8080/agents \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <registration_key>" \
     -d '{
       "name": "CrewFlow Coordinator",
       "connection_model": "always_on",
       "message_exchange": true,
       "pre_invocation_mediation": [],
       "post_invocation_mediation": [],
       "event_reporting": []
     }'
   ```
   Save the returned `id` and `api_key` to `SWITCH_AGENT_ID` and `SWITCH_API_KEY`.

3. **Map Switch Room to CrewFlow Conversation**:
   ```http
   POST /api/v1/integrations/switch/rooms/map
   Content-Type: application/json

   {
     "roomId": "!room_kickoff:switch",
     "conversationId": "cuid_conversation_123"
   }
   ```

---

## 6. Integration Health Endpoints

- **Status**: `GET /api/v1/integrations/switch/status`
  Returns connection state, transport, timestamps of last received/sent messages, and retry count. Sensitive tokens are never leaked.
- **Bridge Health Probe**: `GET /api/v1/integrations/switch/health`
  Pings the Switch server's `GET /health` endpoint to verify live network reachability. Returns HTTP 200 or 503.

