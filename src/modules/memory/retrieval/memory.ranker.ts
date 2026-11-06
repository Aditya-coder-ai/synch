import type { MemoryRecord, RankedMemory } from '../memory.types.js';
import { MemoryCategory } from '../../../database/types.js';

export class MemoryRanker {
  /**
   * Ranks memories using an explainable multi-factor scoring formula (0 to 100).
   */
  public static rank(memories: MemoryRecord[], keywords: string[] = []): RankedMemory[] {
    const now = Date.now();
    const ranked: RankedMemory[] = [];

    for (const memory of memories) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Keyword Relevance (0 to 40 pts)
      if (keywords.length > 0) {
        const text = `${memory.title} ${memory.content}`.toLowerCase();
        let matches = 0;
        for (const kw of keywords) {
          if (text.includes(kw.toLowerCase())) {
            matches++;
          }
        }
        const kwPoints = Math.round((matches / keywords.length) * 40);
        score += kwPoints;
        if (kwPoints > 0) {
          reasons.push(`Matched ${matches}/${keywords.length} query keywords (+${kwPoints} pts)`);
        }
      } else {
        score += 20; // baseline if no keywords specified
        reasons.push('Baseline relevance score (+20 pts)');
      }

      // 2. Verification Status Bonus (+25 pts)
      if (memory.metadata.verified) {
        score += 25;
        reasons.push('Verified fact backed by execution evidence (+25 pts)');
      } else {
        reasons.push('Unverified note (0 pts)');
      }

      // 3. Category Weight (+15 pts for Decisions & Technical Knowledge)
      if (
        memory.category === MemoryCategory.DECISION ||
        memory.category === MemoryCategory.TECHNICAL_KNOWLEDGE
      ) {
        score += 15;
        reasons.push(`High-value category '${memory.category}' (+15 pts)`);
      } else {
        score += 5;
        reasons.push(`Category '${memory.category}' (+5 pts)`);
      }

      // 4. Confidence Bonus (up to 10 pts)
      const confidence = memory.metadata.confidence ?? 0.8;
      const confPoints = Math.round(confidence * 10);
      score += confPoints;
      reasons.push(`Confidence rating ${confidence} (+${confPoints} pts)`);

      // 5. Recency Decay Factor (up to 10 pts)
      const ageInDays = Math.max(0, (now - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const recencyPoints = Math.max(0, Math.round(10 - Math.min(ageInDays, 10)));
      score += recencyPoints;
      if (recencyPoints > 0) {
        reasons.push(`Recency bonus (${Math.round(ageInDays)} days old, +${recencyPoints} pts)`);
      }

      ranked.push({
        memory,
        score: Math.min(100, Math.max(0, score)),
        matchReasons: reasons,
      });
    }

    // Sort descending by score, then by recency
    ranked.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(b.memory.createdAt).getTime() - new Date(a.memory.createdAt).getTime();
    });

    return ranked;
  }
}
