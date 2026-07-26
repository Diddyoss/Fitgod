/**
 * Background removal for garment photos, kept pure so it can be unit-tested:
 * the caller supplies RGBA pixels from a canvas.
 *
 * The approach suits what the app actually asks for — an item photographed
 * flat against a plain background. It estimates the background from the border
 * pixels, flood-fills inward from the edges, and only removes what is both
 * close to that colour AND connected to the edge. That keeps interior detail
 * (a white logo on a black shirt) while taking the surround away.
 *
 * Deliberately no ML model: a WASM segmentation model would be tens of
 * megabytes and could not run under the app's CSP.
 */

export interface CutoutResult {
  /** RGBA, same dimensions as the input; background pixels have alpha 0. */
  data: Uint8ClampedArray;
  /** Tight box around what survived — used to trim dead space. */
  bbox: { x: number; y: number; w: number; h: number };
  /** Fraction of pixels removed, 0–1. */
  removed: number;
  /** False when removal was rejected and `data` is the untouched input. */
  applied: boolean;
}

/** Past this, we assume the estimate was wrong and keep the original. */
const MAX_REMOVED = 0.92;
/** Below this, removal achieved nothing worth the alpha channel. */
const MIN_REMOVED = 0.01;
const DEFAULT_TOLERANCE = 48;

/** Most common border colour, refined to the mean of its bucket. */
function estimateBackground(
  src: Uint8ClampedArray,
  w: number,
  h: number,
): [number, number, number] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();

  const add = (px: number) => {
    const i = px * 4;
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      cur.n++;
      cur.r += r;
      cur.g += g;
      cur.b += b;
    } else {
      buckets.set(key, { n: 1, r, g, b });
    }
  };

  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }

  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const v of buckets.values()) if (v.n > best.n) best = v;
  if (best.n === 0) return [255, 255, 255];
  return [best.r / best.n, best.g / best.n, best.b / best.n];
}

export function removeBackground(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number = DEFAULT_TOLERANCE,
): CutoutResult {
  const total = width * height;
  const untouched = (): CutoutResult => ({
    data: src,
    bbox: { x: 0, y: 0, w: width, h: height },
    removed: 0,
    applied: false,
  });

  if (total === 0 || src.length < total * 4) return untouched();

  const [br, bg, bb] = estimateBackground(src, width, height);
  const tol2 = tolerance * tolerance;

  const isBackgroundish = (px: number) => {
    const i = px * 4;
    const dr = src[i] - br;
    const dg = src[i + 1] - bg;
    const db = src[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  // Flood fill inward from every matching border pixel (4-connected).
  const mask = new Uint8Array(total);
  const stack = new Int32Array(total);
  let sp = 0;

  const seed = (px: number) => {
    if (!mask[px] && isBackgroundish(px)) {
      mask[px] = 1;
      stack[sp++] = px;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  let removed = sp;
  while (sp > 0) {
    const px = stack[--sp];
    const x = px % width;
    const y = (px / width) | 0;

    const push = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const n = ny * width + nx;
      if (mask[n] || !isBackgroundish(n)) return;
      mask[n] = 1;
      stack[sp++] = n;
      removed++;
    };
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  const fraction = removed / total;
  if (fraction > MAX_REMOVED || fraction < MIN_REMOVED) return untouched();

  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  for (let px = 0; px < total; px++) {
    if (mask[px]) out[px * 4 + 3] = 0;
  }

  // Soften the cut edge — a hard binary mask reads as jagged at display size.
  const alpha = new Uint8ClampedArray(total);
  for (let px = 0; px < total; px++) alpha[px] = out[px * 4 + 3];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = y * width + x;
      // Only touch the boundary; interiors stay fully opaque.
      if (alpha[px] === 0) continue;
      let sum = 0;
      let n = 0;
      let edge = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const a = alpha[ny * width + nx];
          if (a === 0) edge = true;
          sum += a;
          n++;
        }
      }
      if (edge && n > 0) out[px * 4 + 3] = sum / n;
    }
  }

  // Trim to what survived.
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (out[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return untouched();

  return {
    data: out,
    bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    removed: fraction,
    applied: true,
  };
}
