import { createHash } from 'node:crypto';
import type { ActionPayload } from '../security.types.js';

/**
 * Recursively canonicalizes an object by sorting all object keys alphabetically.
 * Ensures consistent serialization regardless of key insertion order.
 */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const result: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    result[k] = canonicalize(v);
  }
  return result;
}

/**
 * Computes a deterministic SHA-256 cryptographic digest of an action payload.
 * Binds the approval to the exact action parameters and execution intent.
 */
export function computeActionDigest(action: ActionPayload): string {
  const canonicalAction = {
    category: action.category,
    type: action.type,
    target: action.target ?? '',
    command: action.command ?? '',
    payload: canonicalize(action.payload ?? {}),
  };

  const serialized = JSON.stringify(canonicalAction);
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Verifies that an action payload matches an expected cryptographic digest.
 */
export function verifyActionDigest(action: ActionPayload, expectedDigest: string): boolean {
  if (!expectedDigest) {
    return false;
  }
  const actualDigest = computeActionDigest(action);
  return actualDigest.toLowerCase() === expectedDigest.toLowerCase();
}
