# CrewFlow Security Architecture & Permission Engine

## 1. Overview & Core Tenets

CrewFlow provides an autonomous multi-agent execution environment controlled by human authority. While agents operate autonomously on low-risk tasks (reading files, authoring code, running unit tests), sensitive and destructive operations are gated by policy evaluation, cryptographic payload digests, and authorized human approvals.

### Core Security Tenets
1. **Default-Deny for Sensitive Actions**: Any action not explicitly matched by an automated allow policy requires human authorization.
2. **Immutable Approval Binding**: An approval is cryptographically bound (via canonical SHA-256 digest) to the exact action payload, project, and execution. If an agent tampers with or mutates the parameters after approval, the execution is immediately blocked.
3. **Execution-Bound & Non-Replayable**: Approvals are single-use and bound to one specific execution context.
4. **Separation of Duties**: Requesters cannot approve their own high-risk or critical operations.
5. **Durable, Append-Only Audit Trail**: Every permission evaluation, approval request, human decision, expiration, and blocked attempt is recorded in PostgreSQL with automated secret scrubbing.
6. **Authenticated Identity**: Approval endpoints reject untrusted user IDs from request bodies; callers must authenticate via verified headers/tokens.

---

## 2. Action Categories

CrewFlow classifies all runtime operations into 15 domain action categories:

| Action Category | Default Risk Level | Description | Default Policy |
|---|---|---|---|
| `FILE_READ` | `L0` (READ_ONLY) | Reading workspace source code & docs | Auto-Allowed within workspace |
| `FILE_CREATE` | `L1` (SAFE_MODIFICATION) | Creating new project files | Auto-Allowed within workspace |
| `FILE_MODIFY` | `L1` (SAFE_MODIFICATION) | Modifying existing workspace files | Auto-Allowed (escalates if secret file) |
| `FILE_DELETE` | `L3` (HIGH_RISK) | Deleting workspace files | Requires Human Approval |
| `COMMAND_EXECUTE` | `L2` (CONTROLLED_EXECUTION) | Running shell commands / builds | Allowed for standard dev; escalates if destructive |
| `TEST_EXECUTE` | `L0` / `L1` | Running test runners (Vitest, Jest) | Auto-Allowed |
| `DATABASE_READ` | `L0` (READ_ONLY) | Querying database records | Auto-Allowed |
| `DATABASE_WRITE` | `L2` (CONTROLLED_EXECUTION) | Modifying database records | Auto-Allowed within dev bounds |
| `DATABASE_MIGRATION` | `L3` (HIGH_RISK) | Running schema migrations | Requires Human Approval |
| `ENVIRONMENT_MODIFY` | `L4` (CRITICAL) | Modifying secrets, `.env`, keys | Strictly Requires Human Approval |
| `NETWORK_ACCESS` | `L2` (CONTROLLED_EXECUTION) | Outbound network requests | Controlled execution |
| `GIT_COMMIT` | `L1` (SAFE_MODIFICATION) | Creating local git commits | Auto-Allowed |
| `GIT_PUSH` | `L3` (HIGH_RISK) | Pushing commits to remote git | Requires Human Approval |
| `DEPLOYMENT` | `L4` (CRITICAL) | Deploying to prod/staging or npm | Strictly Requires Human Approval |
| `EXTERNAL_SERVICE_ACTION` | `L3` (HIGH_RISK) | Triggering SaaS / external webhooks | Requires Human Approval |

---

## 3. Calibrated Risk Levels

CrewFlow defines a 5-tier risk taxonomy:

* **`L0` — READ_ONLY**: Harmless operations that observe workspace state without mutating files, databases, or environments.
* **`L1` — SAFE_MODIFICATION**: Local edits, file creation, and git commits within the project workspace.
* **`L2` — CONTROLLED_EXECUTION**: Non-destructive shell commands (e.g. `npm run build`), network fetches, and application database writes.
* **`L3` — HIGH_RISK**: Irreversible or public-facing actions: git pushes, schema migrations, broad file deletions, and external API mutations.
* **`L4` — CRITICAL**: Production deployments, package publishing (`npm publish`), destructive shell commands (`rm -rf /`), destructive database migrations (`DROP TABLE`), and modification of secrets (`.env`, `credentials.json`, `id_rsa`).

---

## 4. Policy Engine & Evaluation Flow

The central evaluator executes `evaluateAction({ user, agent, project, execution, action })`:

```mermaid
flowchart TD
    Req[Incoming Agent Action] --> Dig[Compute Canonical SHA-256 Action Digest]
    Dig --> Rules[Evaluate Prioritized Security Policies]
    Rules --> PathCheck{Path Traversal / Null Byte?}
    PathCheck -- Yes --> Deny[DENIED: L4 Risk]
    PathCheck -- No --> SecretCheck{Targets .env / Secrets?}
    SecretCheck -- Yes --> ApprEnv[APPROVAL_REQUIRED: L4 Risk - OWNER required]
    SecretCheck -- No --> DestructCheck{Destructive Command?}
    DestructCheck -- Yes --> ApprDestruct[APPROVAL_REQUIRED: L4 Risk - ADMIN required]
    DestructCheck -- No --> DeployCheck{Deploy / Git Push?}
    DeployCheck -- Yes --> ApprDeploy[APPROVAL_REQUIRED: L3/L4 Risk]
    DeployCheck -- No --> SafeCheck{Standard Workspace Dev?}
    SafeCheck -- Yes --> Allow[ALLOWED: L0/L1 Risk]
    SafeCheck -- No --> Fallback{Default Deny?}
    Fallback -- Yes --> DenyUnclass[DENIED: Unclassified]
    Fallback -- No --> Allow
```

---

## 5. Runtime Enforcement & Execution Guard

CrewFlow does **not** rely on agent system prompts alone for security. Enforcement happens at the execution boundary:

1. **`ActionGuard`**: Pre-validates filesystem paths for null bytes and `..` path traversal, and scans commands for destructive patterns.
2. **`ExecutionGuard`**: Intercepts `OpenCodeExecutionProvider.execute()`:
   * Evaluates the action through `PermissionEvaluator`.
   * If `ALLOWED`: permits execution directly.
   * If `DENIED`: blocks execution immediately and logs an audit failure.
   * If `APPROVAL_REQUIRED`:
     * Queries PostgreSQL for an active `APPROVED` record bound to `(executionId, actionDigest)`.
     * Validates that `expiresAt` has not elapsed.
     * Validates that `actionDigest` matches the exact current payload.
     * If valid: resumes execution.
     * If missing: automatically creates a `PENDING` approval record, notifies the project's Switch room, logs to `AuditLog`, and pauses execution in `AWAITING_APPROVAL` status.

---

## 6. Audit Trail & Secret Scrubbing

All security-sensitive operations are recorded in the `AuditLog` table:
* **Fields**: `id`, `actorId`, `actorType` (`HUMAN`, `AGENT`, `SYSTEM`), `workspaceId`, `projectId`, `actionCategory`, `actionType`, `riskLevel`, `outcome` (`ALLOWED`, `APPROVAL_REQUIRED`, `DENIED`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `BLOCKED`), `reason`, `metadata`, `createdAt`.
* **Append-Only**: The repository and service expose only `.append()` and `.findMany()`. No delete or update operations exist.
* **Secret Scrubbing**: Regex filters automatically scrub API keys (`sk-...`, `ghp_...`), Bearer tokens, private keys (`-----BEGIN PRIVATE KEY-----`), passwords, and token fields from metadata before persistence.

---

## 7. Known Security Limitations

1. **OS Sandbox Boundaries**: While workspace directory containment prevents relative path traversal (`../`), defense against kernel-level breakouts requires running containers (Docker/gVisor) in production environments.
2. **Dynamic Script Content**: Commands passed as strings are scanned for known dangerous binaries (`rm -rf`, `dd`, `mkfs`); obfuscated bash scripts (e.g. base64-encoded strings piped to bash) require runtime isolation.
3. **Network Isolation**: Network restrictions depend on the host firewall or container network namespace when OpenCode runs in non-isolated network mode.

