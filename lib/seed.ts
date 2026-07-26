/**
 * FNV-1a, 32-bit. Same hash Aura uses for cache keys — kept identical so the
 * two codebases stay comparable.
 */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small fast PRNG. Deterministic for a given seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The per-day rotation seed. Same user + same date always yields the same value. */
export function daySeed(userId: string, dateISO: string): number {
  return fnv1a(`${userId}::${dateISO}`);
}
