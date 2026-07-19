// Each helper accepts an optional seeded `rng: () => number` (e.g.
// mulberry32 from src/knowledge/rng.ts) so callers that need deterministic,
// reproducible output — dataset generation in particular, see
// generateFromSpec.ts's SEED constant — can thread it through instead of
// silently falling back to Math.random(). Defaults to Math.random() so
// non-generation call sites (if any) don't need to change.

export function randomItem<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function chance(probability: number, rng: () => number = Math.random): boolean {
  return rng() < probability;
}

export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
