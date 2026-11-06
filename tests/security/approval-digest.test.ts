import { describe, it, expect } from 'vitest';
import {
  computeActionDigest,
  verifyActionDigest,
} from '../../src/modules/security/approvals/approval.digest.js';
import { ActionCategory } from '../../src/modules/security/security.types.js';

describe('Phase 7: Cryptographic Approval Digest Tests', () => {
  it('generates identical SHA-256 digests regardless of object key order', () => {
    const actionA = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'deploy',
      command: 'kubectl apply -f k8s/',
      payload: {
        environment: 'production',
        replicas: 5,
        config: { dryRun: false, timeout: 300 },
      },
    };

    const actionB = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'deploy',
      command: 'kubectl apply -f k8s/',
      payload: {
        config: { timeout: 300, dryRun: false },
        replicas: 5,
        environment: 'production',
      },
    };

    const digestA = computeActionDigest(actionA);
    const digestB = computeActionDigest(actionB);

    expect(digestA).toHaveLength(64);
    expect(digestA).toBe(digestB);
    expect(verifyActionDigest(actionB, digestA)).toBe(true);
  });

  it('detects payload modifications and rejects tampered digests', () => {
    const originalAction = {
      category: ActionCategory.FILE_MODIFY,
      type: 'update_config',
      target: 'src/config/app.json',
      payload: { port: 8080 },
    };

    const tamperedAction = {
      category: ActionCategory.FILE_MODIFY,
      type: 'update_config',
      target: 'src/config/app.json',
      payload: { port: 9090 }, // Tampered value
    };

    const digest = computeActionDigest(originalAction);

    expect(verifyActionDigest(originalAction, digest)).toBe(true);
    expect(verifyActionDigest(tamperedAction, digest)).toBe(false);
  });

  it('detects command modifications in shell actions', () => {
    const action = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'run_test',
      command: 'npm test',
    };

    const tamperedCommand = {
      category: ActionCategory.COMMAND_EXECUTE,
      type: 'run_test',
      command: 'npm test && rm -rf /', // Tampered command injected
    };

    const digest = computeActionDigest(action);

    expect(verifyActionDigest(tamperedCommand, digest)).toBe(false);
  });
});
