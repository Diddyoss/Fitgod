import { outfitColorScore } from "./color";
import { daysBetween } from "./dates";
import { daySeed, fnv1a, mulberry32 } from "./seed";
import { CATEGORIES, type Category, type Garment, type Outfit, type OutfitHistoryEntry } from "./types";

const MAX_COMBOS = 400;
const TOP_N = 8;

/** Weights sum to 0.80; the remaining headroom is the jitter band. */
const W_COLOR = 0.4;
const W_FORMALITY = 0.25;
const W_WARMTH = 0.15;
const JITTER = 0.15;

const RECENT_GARMENT_DAYS = 3;
const RECENT_COMBO_DAYS = 7;
const PENALTY_GARMENT = 0.5;
const PENALTY_COMBO = 1;

export interface RankOptions {
  maxCombos?: number;
  topN?: number;
}

/** Categories with nothing in them. Drives the empty states. */
export function wardrobeGaps(garments: Garment[]): Category[] {
  const have = new Set(garments.map((g) => g.category));
  return CATEGORIES.filter((c) => !have.has(c));
}

/** 1 when all three agree, 0 when they span the full 1–5 range. */
function spreadScore(values: number[]): number {
  return 1 - (Math.max(...values) - Math.min(...values)) / 4;
}

/**
 * Rank today's outfits.
 *
 * Deterministic for a given (userId, dateISO, wardrobe, history): the same day
 * always produces the same ranking, so nothing about the daily pick needs to be
 * stored. It rotates because the jitter term is seeded on the date.
 *
 * The jitter is keyed per *combination* rather than drawn per iteration, so the
 * result does not depend on enumeration order.
 */
export function rankOutfits(
  garments: Garment[],
  userId: string,
  dateISO: string,
  history: OutfitHistoryEntry[] = [],
  opts: RankOptions = {},
): Outfit[] {
  const maxCombos = opts.maxCombos ?? MAX_COMBOS;
  const topN = opts.topN ?? TOP_N;

  const tops = garments.filter((g) => g.category === "top");
  const bottoms = garments.filter((g) => g.category === "bottom");
  const shoes = garments.filter((g) => g.category === "shoes");
  if (!tops.length || !bottoms.length || !shoes.length) return [];

  const seed = daySeed(userId, dateISO);

  // Most-recent-wear lookups, in days before dateISO.
  const garmentLastWorn = new Map<string, number>();
  const comboLastWorn = new Map<string, number>();
  for (const entry of history) {
    const daysAgo = daysBetween(entry.date, dateISO);
    if (daysAgo < 0) continue; // future entries never penalise
    for (const id of entry.garmentIds) {
      const prev = garmentLastWorn.get(id);
      if (prev === undefined || daysAgo < prev) garmentLastWorn.set(id, daysAgo);
    }
    const key = entry.garmentIds.slice().sort().join("|");
    const prev = comboLastWorn.get(key);
    if (prev === undefined || daysAgo < prev) comboLastWorn.set(key, daysAgo);
  }

  const total = tops.length * bottoms.length * shoes.length;
  const combos: Array<[Garment, Garment, Garment]> = [];

  if (total <= maxCombos) {
    for (const t of tops) for (const b of bottoms) for (const s of shoes) combos.push([t, b, s]);
  } else {
    // Deterministic sample of the combination space, seeded on the day.
    const rnd = mulberry32(seed);
    const seen = new Set<number>();
    while (combos.length < maxCombos && seen.size < total) {
      const idx = Math.floor(rnd() * total);
      if (seen.has(idx)) continue;
      seen.add(idx);
      const si = idx % shoes.length;
      const bi = Math.floor(idx / shoes.length) % bottoms.length;
      const ti = Math.floor(idx / (shoes.length * bottoms.length)) % tops.length;
      combos.push([tops[ti], bottoms[bi], shoes[si]]);
    }
  }

  const scored: Outfit[] = combos.map(([t, b, s]) => {
    const ids = [t.id, b.id, s.id];
    const key = ids.slice().sort().join("|");

    const colorHarmony = outfitColorScore([t.colors, b.colors, s.colors]);
    const formalityMatch = spreadScore([t.formality, b.formality, s.formality]);
    const warmthCoherence = spreadScore([t.warmth, b.warmth, s.warmth]);
    const jitter = JITTER * mulberry32(seed ^ fnv1a(key))();

    let penalty = 0;
    const wornRecently = ids.some((id) => {
      const d = garmentLastWorn.get(id);
      return d !== undefined && d <= RECENT_GARMENT_DAYS;
    });
    if (wornRecently) penalty += PENALTY_GARMENT;
    const comboAgo = comboLastWorn.get(key);
    if (comboAgo !== undefined && comboAgo <= RECENT_COMBO_DAYS) penalty += PENALTY_COMBO;

    const score =
      W_COLOR * colorHarmony +
      W_FORMALITY * formalityMatch +
      W_WARMTH * warmthCoherence +
      jitter -
      penalty;

    return { topId: t.id, bottomId: b.id, shoesId: s.id, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tiebreak so equal scores never reorder between calls.
    const ka = [a.topId, a.bottomId, a.shoesId].sort().join("|");
    const kb = [b.topId, b.bottomId, b.shoesId].sort().join("|");
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return scored.slice(0, topN);
}

/** Look up the actual garments behind an outfit. Returns null if any is missing. */
export function resolveOutfit(
  outfit: Outfit,
  garments: Garment[],
): { top: Garment; bottom: Garment; shoes: Garment } | null {
  const byId = new Map(garments.map((g) => [g.id, g]));
  const top = byId.get(outfit.topId);
  const bottom = byId.get(outfit.bottomId);
  const shoes = byId.get(outfit.shoesId);
  if (!top || !bottom || !shoes) return null;
  return { top, bottom, shoes };
}
