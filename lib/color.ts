export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  l: number;
}

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Black, white, grey, and near-grey. Neutrals go with everything, which is the
 * single most useful fact in outfit color matching.
 */
export function isNeutral(hsl: Hsl): boolean {
  return hsl.s < 0.15 || hsl.l < 0.12 || hsl.l > 0.92;
}

/** Shortest distance around the hue circle, 0–180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * How well two colors sit together, 0–1.
 * Unparseable input scores neutral-ish rather than throwing, so a bad hex
 * degrades one pair instead of breaking the whole ranking.
 */
export function pairScore(a: string, b: string): number {
  const A = hexToHsl(a);
  const B = hexToHsl(b);
  if (!A || !B) return 0.5;
  if (isNeutral(A) || isNeutral(B)) return 1;

  const d = hueDistance(A.h, B.h);
  if (d <= 40) return 0.85; // analogous
  if (d >= 150) return 0.75; // complementary
  if (d >= 60 && d <= 120) return 0.35; // clashing mid-range
  return 0.55; // transitional
}

/**
 * Mean of the best available pairing between each pair of garments. Taking the
 * best (not the mean) within a garment's own palette means a navy jacket with
 * white trim is judged on whichever of its colors actually works.
 */
export function outfitColorScore(colorSets: string[][]): number {
  const sets = colorSets.filter((s) => s.length > 0);
  if (sets.length < 2) return 1;

  let total = 0;
  let n = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      let best = 0;
      for (const a of sets[i]) {
        for (const b of sets[j]) best = Math.max(best, pairScore(a, b));
      }
      total += best;
      n++;
    }
  }
  return n ? total / n : 1;
}
