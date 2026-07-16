import { ResolvedTaxonomy, ConfidenceLevel } from '../types';

export interface TaxonomyRecord {
  id: string;
  name: string;
  aliases?: string[];
}

export class TaxonomyResolver {
  
  /**
   * Resolves a raw string against a database of known taxonomy records (e.g. categories or merchants).
   * It uses exact matching first, and falls back to fuzzy matching (Levenshtein distance).
   */
  static resolve(raw: string, database: TaxonomyRecord[]): ResolvedTaxonomy {
    const original = raw;
    const text = raw.trim().toLowerCase();

    if (!text || !database || database.length === 0) {
      return { id: null, matchedName: null, confidence: 'low', original };
    }

    // 1. Exact Match
    for (const record of database) {
      if (record.name.toLowerCase() === text) {
        return { id: record.id, matchedName: record.name, confidence: 'high', original };
      }
      if (record.aliases) {
        for (const alias of record.aliases) {
          if (alias.toLowerCase() === text) {
            return { id: record.id, matchedName: record.name, confidence: 'high', original };
          }
        }
      }
    }

    // 2. Substring Match (e.g., "amazon" matches "amazon prime")
    for (const record of database) {
      if (record.name.toLowerCase().includes(text) || text.includes(record.name.toLowerCase())) {
        return { id: record.id, matchedName: record.name, confidence: 'medium', original };
      }
      if (record.aliases) {
        for (const alias of record.aliases) {
          if (alias.toLowerCase().includes(text) || text.includes(alias.toLowerCase())) {
            return { id: record.id, matchedName: record.name, confidence: 'medium', original };
          }
        }
      }
    }

    // 3. Fuzzy Match (Levenshtein distance)
    let bestMatch: TaxonomyRecord | null = null;
    let minDistance = Infinity;

    for (const record of database) {
      const dist = this.levenshtein(text, record.name.toLowerCase());
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = record;
      }
      if (record.aliases) {
        for (const alias of record.aliases) {
          const aliasDist = this.levenshtein(text, alias.toLowerCase());
          if (aliasDist < minDistance) {
            minDistance = aliasDist;
            bestMatch = record;
          }
        }
      }
    }

    // Threshold for acceptable typo (e.g. max distance of 2 for short words, 3 for longer words)
    const threshold = text.length <= 4 ? 1 : 3;

    if (bestMatch && minDistance <= threshold) {
      return { id: bestMatch.id, matchedName: bestMatch.name, confidence: 'medium', original };
    }

    // 4. Failed to resolve
    return { id: null, matchedName: null, confidence: 'low', original };
  }

  /**
   * Standard Levenshtein distance algorithm for fuzzy string matching.
   * Can be replaced with fuse.js later.
   */
  private static levenshtein(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
