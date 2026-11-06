export interface ContextItem {
  id: string;
  category: string;
  title: string;
  content: string;
  verified: boolean;
  sourceType: string;
  sourceId?: string | null;
  confidence: number;
}

export interface StructuredAgentContext {
  projectId: string;
  taskId: string;
  projectSummary: string;
  decisions: ContextItem[];
  technicalKnowledge: ContextItem[];
  taskHistory: ContextItem[];
  lessonsLearned: ContextItem[];
  verifiedFactsCount: number;
  unverifiedNotesCount: number;
  totalTokensApprox: number;
  assembledAt: string;
}

export interface ContextBuildConfig {
  maxContextCharacters?: number; // default: 16000 (~4000 tokens)
  maxItemsPerCategory?: number;  // default: 5
  prioritizeVerified?: boolean;  // default: true
  minConfidenceThreshold?: number; // default: 0.5
}
