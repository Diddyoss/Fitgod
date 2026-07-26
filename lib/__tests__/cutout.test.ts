import { describe, expect, it } from "vitest";
import { removeBackground } from "../cutout";

/** Build an RGBA image from a paint callback. */
function image(
  w: number,
  h: number,
  paint: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * w + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

const WHITE: [number, number, number] = [250, 250, 248];
const RED: [number, number, number] = [200, 40, 40];

/** White field with a red rectangle inside it. */
function garmentOnWhite(w = 40, h = 40, box = { x: 10, y: 8, w: 20, h: 24 }) {
  return image(w, h, (x, y) =>
    x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h ? RED : WHITE,
  );
}

function alphaAt(r: { data: Uint8ClampedArray }, w: number, x: number, y: number) {
  return r.data[(y * w + x) * 4 + 3];
}

describe("removeBackground", () => {
  it("removes a plain background and keeps the garment", () => {
    const res = removeBackground(garmentOnWhite(), 40, 40);
    expect(res.applied).toBe(true);
    expect(alphaAt(res, 40, 0, 0)).toBe(0); // corner is background
    expect(alphaAt(res, 40, 20, 20)).toBe(255); // middle of the garment
  });

  it("trims to the garment's bounding box", () => {
    const res = removeBackground(garmentOnWhite(), 40, 40);
    expect(res.bbox).toEqual({ x: 10, y: 8, w: 20, h: 24 });
  });

  it("reports roughly the right amount removed", () => {
    const res = removeBackground(garmentOnWhite(), 40, 40);
    // 40x40 minus a 20x24 garment = 1120/1600
    expect(res.removed).toBeGreaterThan(0.65);
    expect(res.removed).toBeLessThan(0.75);
  });

  it("keeps interior detail that matches the background colour", () => {
    // A white logo in the middle of the garment must survive — it is not
    // connected to the border, so the flood fill never reaches it.
    const w = 40;
    const src = image(w, 40, (x, y) => {
      const inGarment = x >= 10 && x < 30 && y >= 8 && y < 32;
      if (!inGarment) return WHITE;
      const inLogo = x >= 18 && x < 22 && y >= 18 && y < 22;
      return inLogo ? WHITE : RED;
    });
    const res = removeBackground(src, w, 40);
    expect(res.applied).toBe(true);
    expect(alphaAt(res, w, 20, 20)).toBe(255); // logo kept
    expect(alphaAt(res, w, 0, 0)).toBe(0); // background gone
  });

  it("leaves the image alone when it is all one colour", () => {
    const res = removeBackground(image(20, 20, () => WHITE), 20, 20);
    expect(res.applied).toBe(false);
    expect(res.removed).toBe(0);
    expect(res.bbox).toEqual({ x: 0, y: 0, w: 20, h: 20 });
  });

  it("leaves the image alone when there is no plain border to work from", () => {
    // Noisy edges mean the flood fill barely spreads.
    const res = removeBackground(
      image(40, 40, (x, y) => [(x * 37) % 256, (y * 91) % 256, ((x + y) * 53) % 256]),
      40,
      40,
    );
    expect(res.applied).toBe(false);
  });

  it("handles a garment that runs off the edge of the frame", () => {
    const src = image(40, 40, (x, y) => (y >= 20 ? RED : WHITE));
    const res = removeBackground(src, 40, 40);
    expect(res.applied).toBe(true);
    expect(res.bbox.y).toBe(20);
    expect(res.bbox.h).toBe(20);
    expect(alphaAt(res, 40, 20, 30)).toBe(255);
  });

  it("softens the cut edge rather than leaving it binary", () => {
    const res = removeBackground(garmentOnWhite(), 40, 40);
    // The pixel just inside the garment border should be partially transparent.
    const edge = alphaAt(res, 40, 10, 20);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });

  it("respects a wider tolerance", () => {
    // A gently graded background comes away more completely with more slack.
    const src = image(40, 40, (x, y) =>
      x >= 12 && x < 28 && y >= 12 && y < 28 ? RED : [232 + (x % 16), 232 + (y % 16), 230],
    );
    const tight = removeBackground(src, 40, 40, 3);
    const wide = removeBackground(src, 40, 40, 48);

    expect(wide.applied).toBe(true);
    expect(wide.removed).toBeGreaterThan(tight.removed);
    // The wide pass should clear essentially all of the surround.
    expect(wide.removed).toBeGreaterThan(0.8);
  });

  it("does not mutate the input", () => {
    const src = garmentOnWhite();
    const copy = new Uint8ClampedArray(src);
    removeBackground(src, 40, 40);
    expect(Array.from(src)).toEqual(Array.from(copy));
  });

  it("survives degenerate input", () => {
    expect(removeBackground(new Uint8ClampedArray(0), 0, 0).applied).toBe(false);
    expect(removeBackground(new Uint8ClampedArray(4), 5, 5).applied).toBe(false);
  });
});
