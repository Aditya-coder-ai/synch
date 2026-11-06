import { describe, it, expect } from 'vitest';
import { ResultVerifier } from '../../src/modules/runtime/execution/execution.verifier.js';

describe('Result Verifier', () => {
  it('should verify file modifications based on OpenCode diff evidence', async () => {
    const evidence = await ResultVerifier.verify({
      diffResponse: [
        { path: 'src/modules/auth/auth.service.ts', status: 'modified' },
        { path: 'tests/auth/auth.test.ts', status: 'added' },
      ],
      exitCode: 0,
      testOutput: 'Test Files 2 passed (2), Tests 8 passed (8)',
    });

    expect(evidence.verified).toBe(true);
    expect(evidence.filesModified).toContain('src/modules/auth/auth.service.ts');
    expect(evidence.filesModified).toContain('tests/auth/auth.test.ts');
    expect(evidence.checks.diffPresent).toBe(true);
    expect(evidence.checks.testsVerified).toBe(true);
  });

  it('should fail verification when process exits with non-zero exit code', async () => {
    const evidence = await ResultVerifier.verify({
      diffResponse: [{ path: 'src/modules/broken.ts' }],
      exitCode: 1,
      testOutput: 'SyntaxError: Unexpected token',
    });

    expect(evidence.verified).toBe(false);
    expect(evidence.checks.testsVerified).toBe(false);
    expect(evidence.details.some(d => d.includes('non-zero failure code'))).toBe(true);
  });

  it('should report unverified when expected target file is missing on disk', async () => {
    const evidence = await ResultVerifier.verify({
      expectedFiles: ['non_existent_generated_contract.json'],
    });

    expect(evidence.verified).toBe(false);
    expect(evidence.checks.filesExist).toBe(false);
  });
});
