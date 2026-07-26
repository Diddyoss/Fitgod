import { describe, expect, it } from "vitest";
import { dominantColors } from "../palette";
import { hexToHsl } from "../color";

/** Build an RGBA buffer from a list of [r,g,b,count] runs. */
function pixels(...runs: Array<[number, number, number, number]>): Uint8ClampedArray {
  const total = runs.reduce((n, r) => n + r[3], 0);
  const buf = new Uint8ClampedArray(total * 4);
  let i = 0;
  for (const [r, g, b, count] of runs) {
    for (let c = 0; c < count; c++) {
      buf[i++] = r;
      buf[i++] = g;
      buf[i++] = b;
      buf[i++] = 255;
    }
  }
  return buf;
}

describe("dominantColors", () => {
  it("finds a single flat color", () => {
    const out = dominantColors(pixels([200, 30, 30, 100]));
    expect(out.length).toBe(1);
    expect(hexToHsl(out[0])!.h).toBeCloseTo(0, 0);
  });

  it("orders colors by how much of the image they cover", () => {
    const out = dominantColors(pixels([200, 30, 30, 300], [30, 30, 200, 100]), 2);
    expect(out.length).toBe(2);
    expect(hexToHsl(out[0])!.h).toBeCloseTo(0, 0); // red dominates
    expect(hexToHsl(out[1])!.h).toBeCloseTo(240, 0);
  });

  it("drops the light background so the garment wins", () => {
    // A navy shirt on a white sweep.
    const out = dominantColors(pixels([250, 250, 250, 800], [20, 30, 90, 200]), 1);
    const hsl = hexToHsl(out[0])!;
    expect(hsl.l).toBeLessThan(0.4);
  });

  it("still reports a light garment when nothing survives the background filter", () => {
    const out = dominantColors(pixels([252, 252, 250, 1000]));
    expect(out.length).toBe(1);
    expect(hexToHsl(out[0])!.l).toBeGreaterThan(0.9);
  });

  it("respects the max count", () => {
    const out = dominantColors(
      pixels([200, 30, 30, 50], [30, 200, 30, 40], [30, 30, 200, 30], [200, 200, 30, 20]),
      2,
    );
    expect(out.length).toBe(2);
  });

  it("ignores transparent pixels", () => {
    const buf = new Uint8ClampedArray(8);
    buf.set([200, 30, 30, 255], 0);
    buf.set([30, 30, 200, 0], 4); // fully transparent
    expect(dominantColors(buf).length).toBe(1);
  });

  it("returns an empty list for empty input", () => {
    expect(dominantColors(new Uint8ClampedArray(0))).toEqual([]);
  });

  it("always returns parseable hex", () => {
    const out = dominantColors(pixels([10, 200, 130, 60], [180, 40, 90, 40]), 3);
    for (const hex of out) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hexToHsl(hex)).not.toBeNull();
    }
  });

  it("is deterministic", () => {
    const p = pixels([200, 30, 30, 120], [30, 30, 200, 80]);
    expect(dominantColors(p, 3)).toEqual(dominantColors(p, 3));
  });
});
