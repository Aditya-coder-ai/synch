import fs from 'node:fs/promises';
import type { SessionDiffResponse } from '../opencode/opencode.schemas.js';
import type { VerificationEvidence } from '../runtime.types.js';

export interface VerificationOptions {
  diffResponse?: SessionDiffResponse;
  expectedFiles?: string[];
  testOutput?: string;
  exitCode?: number;
}

export class ResultVerifier {
  /**
   * Evaluates tangible evidence produced by an execution session.
   * Does NOT rely solely on agent-generated text affirmations.
   */
  public static async verify(options: VerificationOptions): Promise<VerificationEvidence> {
    const details: string[] = [];
    const filesModified: string[] = [];

    // 1. Analyze Diff Response
    let diffPresent = false;
    let diffSummary = '';

    if (options.diffResponse) {
      if (Array.isArray(options.diffResponse)) {
        for (const item of options.diffResponse) {
          if (item.path) {
            filesModified.push(item.path);
          }
        }
        diffPresent = filesModified.length > 0;
        diffSummary = `Modified ${filesModified.length} files`;
      } else if (typeof options.diffResponse === 'object') {
        if (options.diffResponse.files) {
          for (const item of options.diffResponse.files) {
            if (item.path) {
              filesModified.push(item.path);
            }
          }
        }
        diffPresent = filesModified.length > 0 || Boolean(options.diffResponse.diff);
        diffSummary = options.diffResponse.diff || `Modified ${filesModified.length} files`;
      }
    }

    if (diffPresent) {
      details.push(`Verified filesystem mutations across ${filesModified.length} file(s)`);
    } else {
      details.push('No file modifications reported in session diff');
    }

    // 2. Verify Expected Files on Disk
    let filesExist = true;
    if (options.expectedFiles && options.expectedFiles.length > 0) {
      for (const filePath of options.expectedFiles) {
        try {
          await fs.access(filePath);
          details.push(`Verified target file exists: ${filePath}`);
        } catch {
          filesExist = false;
          details.push(`Expected target file missing on disk: ${filePath}`);
        }
      }
    }

    // 3. Verify Test Output & Exit Code
    let testsVerified = true;
    if (options.exitCode !== undefined) {
      if (options.exitCode === 0) {
        details.push('Process exited with clean status code 0');
      } else {
        testsVerified = false;
        details.push(`Process exited with non-zero failure code: ${options.exitCode}`);
      }
    }

    if (options.testOutput) {
      const lower = options.testOutput.toLowerCase();
      if (lower.includes('failed') || lower.includes('error:')) {
        testsVerified = false;
        details.push('Test runner logs indicate test failures or errors');
      } else if (lower.includes('passed') || lower.includes('ok')) {
        details.push('Test runner logs confirm test suite passed');
      }
    }

    // Overall verification requires that if expected files were specified, they must exist,
    // and if tests were executed, they must pass.
    const verified = filesExist && testsVerified;

    return {
      verified,
      filesModified,
      diffSummary,
      testPassed: testsVerified,
      exitCode: options.exitCode ?? 0,
      checks: {
        diffPresent,
        filesExist,
        testsVerified,
      },
      details,
    };
  }
}

