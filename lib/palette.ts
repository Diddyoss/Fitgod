import { hexToHsl, rgbToHex } from "./color";

/**
 * Dominant color extraction, kept pure so it can be unit-tested: the caller
 * supplies RGBA pixels from a downsampled canvas.
 *
 * This exists because vision models are unreliable at naming precise hex
 * values — they answer "#000000" for charcoal and "#FFFFFF" for cream. Since
 * lib/rotation.ts derives 40% of its score from color harmony, model-guessed
 * hexes would quietly skew every ranking. Measuring pixels is free, exact and
 * deterministic.
 */

const HUE_BUCKETS = 12;
const LIGHT_BANDS = 3;
/** Photographed on a light surface, the background is the single biggest blob. */
const BACKGROUND_L = 0.93;
/** If dropping the background leaves almost nothing, the garment *was* the light thing. */
const MIN_KEPT_RATIO = 0.05;

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

function bucketKey(r: number, g: number, b: number): string | null {
  const hsl = hexToHsl(rgbToHex(r, g, b));
  if (!hsl) return null;
  const band = Math.min(LIGHT_BANDS - 1, Math.floor(hsl.l * LIGHT_BANDS));
  // Greys have meaningless hue, so they share one slot per lightness band.
  if (hsl.s < 0.12) return `n:${band}`;
  const hue = Math.floor(hsl.h / (360 / HUE_BUCKETS)) % HUE_BUCKETS;
  return `${hue}:${band}`;
}

function tally(pixels: Uint8ClampedArray, skipLight: boolean): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 128) continue; // transparent
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (skipLight && (r + g + b) / 765 > BACKGROUND_L) continue;

    const key = bucketKey(r, g, b);
    if (!key) continue;
    const existing = buckets.get(key);
    if (existing) {
      existing.count++;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }
  return buckets;
}

function totalCount(buckets: Map<string, Bucket>): number {
  let n = 0;
  for (const b of buckets.values()) n += b.count;
  return n;
}

/**
 * @param pixels RGBA from a downsampled canvas (64x64 is plenty).
 * @param max    How many colors to return, dominant first.
 */
export function dominantColors(pixels: Uint8ClampedArray, max = 3): string[] {
  if (pixels.length < 4) return [];

  let buckets = tally(pixels, true);
  const kept = totalCount(buckets);
  const all = Math.floor(pixels.length / 4);

  // A white shirt on a white background would otherwise come back empty.
  if (kept < all * MIN_KEPT_RATIO) buckets = tally(pixels, false);
  if (buckets.size === 0) return [];

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((b) => rgbToHex(b.r / b.count, b.g / b.count, b.b / b.count));
}
