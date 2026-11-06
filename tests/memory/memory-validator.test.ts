import { describe, it, expect } from 'vitest';
import { MemoryValidator } from '../../src/modules/memory/extraction/memory.validator.js';
import { MemoryCategory } from '../../src/database/types.js';
import type { CandidateMemory } from '../../src/modules/memory/memory.types.js';

describe('Memory Validator & Secret Filtering', () => {
  it('should accept valid candidate memories', () => {
    const candidate: CandidateMemory = {
      projectId: 'proj_alpha',
      category: MemoryCategory.TECHNICAL_KNOWLEDGE,
      title: 'Fastify Type Provider Integration',
      content: 'CrewFlow uses fastify-type-provider-zod for route validation and OpenAPI generation.',
      sourceType: 'DOCUMENTATION',
    };

    const result = MemoryValidator.validate(candidate);
    expect(result.valid).toBe(true);
    expect(result.sanitizedMemory?.title).toBe('Fastify Type Provider Integration');
  });

  it('should reject candidate with missing projectId or empty title', () => {
    const invalidCandidate: CandidateMemory = {
      projectId: '',
      category: MemoryCategory.PROJECT_CONTEXT,
      title: '  ',
      content: 'Some valid length content here.',
      sourceType: 'USER_INSTRUCTION',
    };

    const result = MemoryValidator.validate(invalidCandidate);
    expect(result.valid).toBe(false);
  });

  it('should reject transient conversational chatter', () => {
    const transientChat: CandidateMemory = {
      projectId: 'proj_alpha',
      category: MemoryCategory.PROJECT_CONTEXT,
      title: 'User message',
      content: 'ok thank you',
      sourceType: 'CHAT',
    };

    const result = MemoryValidator.validate(transientChat);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toContain('transient conversational noise');
  });

  it('should redact secrets, passwords, tokens, and database URLs', () => {
    const secretCandidate: CandidateMemory = {
      projectId: 'proj_alpha',
      category: MemoryCategory.TECHNICAL_KNOWLEDGE,
      title: 'Database connection configuration with api_key=sk_live_1234567890abcdef',
      content: 'Connected to postgresql://admin:super_secret_pw123@db.supabase.com:5432/main with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123',
      sourceType: 'USER_INSTRUCTION',
    };

    const result = MemoryValidator.validate(secretCandidate);
    expect(result.valid).toBe(true);
    expect(result.sanitizedMemory?.title).toContain('[REDACTED]');
    expect(result.sanitizedMemory?.content).toContain('postgresql://[REDACTED_USER]:[REDACTED_PW]@[HOST]');
    expect(result.sanitizedMemory?.content).toContain('Bearer [REDACTED]');
    expect(result.sanitizedMemory?.content).not.toContain('super_secret_pw123');
    expect(result.sanitizedMemory?.content).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123');
  });
});
