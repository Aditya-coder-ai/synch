import type { ContextBuildConfig } from './context.types.js';

export const DEFAULT_CONTEXT_POLICY: Required<ContextBuildConfig> = {
  maxContextCharacters: 16000,
  maxItemsPerCategory: 5,
  prioritizeVerified: true,
  minConfidenceThreshold: 0.4,
};

