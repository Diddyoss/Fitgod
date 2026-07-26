import { describe, expect, it } from "vitest";
import {
  hexToHsl,
  hueDistance,
  isNeutral,
  outfitColorScore,
  pairScore,
  rgbToHex,
} from "../color";

describe("hexToHsl", () => {
  it("parses with and without the hash", () => {
    expect(hexToHsl("#ff0000")).not.toBeNull();
    expect(hexToHsl("ff0000")).not.toBeNull();
  });

  it("rejects malformed input rather than guessing", () => {
    expect(hexToHsl("#fff")).toBeNull();
    expect(hexToHsl("nope")).toBeNull();
    expect(hexToHsl("")).toBeNull();
  });

  it("reads primaries at the expected hues", () => {
    expect(hexToHsl("#ff0000")!.h).toBeCloseTo(0, 1);
    expect(hexToHsl("#00ff00")!.h).toBeCloseTo(120, 1);
    expect(hexToHsl("#0000ff")!.h).toBeCloseTo(240, 1);
  });

  it("reports greys as unsaturated", () => {
    expect(hexToHsl("#808080")!.s).toBeCloseTo(0, 5);
    expect(hexToHsl("#000000")!.l).toBeCloseTo(0, 5);
    expect(hexToHsl("#ffffff")!.l).toBeCloseTo(1, 5);
  });
});

describe("rgbToHex", () => {
  it("round-trips and clamps out-of-range channels", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
    expect(rgbToHex(-20, 300, 128)).toBe("#00ff80");
  });
});

describe("isNeutral", () => {
  it("treats black, white and grey as neutral", () => {
    for (const hex of ["#000000", "#ffffff", "#808080", "#1a1a1c"]) {
      expect(isNeutral(hexToHsl(hex)!)).toBe(true);
    }
  });

  it("does not treat saturated mid-tones as neutral", () => {
    for (const hex of ["#c8ff00", "#d4af37", "#3d5afe"]) {
      expect(isNeutral(hexToHsl(hex)!)).toBe(false);
    }
  });
});

describe("hueDistance", () => {
  it("takes the short way round the circle", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(90, 90)).toBe(0);
  });

  it("never exceeds 180", () => {
    for (let a = 0; a < 360; a += 17) {
      for (let b = 0; b < 360; b += 23) {
        expect(hueDistance(a, b)).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("pairScore", () => {
  it("pairs anything with a neutral", () => {
    expect(pairScore("#000000", "#ff0000")).toBe(1);
    expect(pairScore("#c8ff00", "#ffffff")).toBe(1);
  });

  it("ranks analogous above clashing", () => {
    const analogous = pairScore("#ff0000", "#ff5c00");
    const clashing = pairScore("#ff0000", "#00ff00");
    expect(analogous).toBeGreaterThan(clashing);
  });

  it("ranks complementary above clashing", () => {
    expect(pairScore("#ff0000", "#00ffff")).toBeGreaterThan(pairScore("#ff0000", "#00ff00"));
  });

  it("is symmetric", () => {
    expect(pairScore("#ff0000", "#0000ff")).toBe(pairScore("#0000ff", "#ff0000"));
  });

  it("degrades gracefully on a bad hex instead of throwing", () => {
    expect(pairScore("garbage", "#ff0000")).toBe(0.5);
  });

  it("stays within 0 and 1", () => {
    const samples = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#c8ff00"];
    for (const a of samples) {
      for (const b of samples) {
        const v = pairScore(a, b);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("outfitColorScore", () => {
  it("scores an all-neutral outfit perfectly", () => {
    expect(outfitColorScore([["#000000"], ["#ffffff"], ["#808080"]])).toBe(1);
  });

  it("scores a clashing outfit below a neutral one", () => {
    const clash = outfitColorScore([["#ff0000"], ["#00ff00"], ["#0000ff"]]);
    expect(clash).toBeLessThan(1);
  });

  it("uses a garment's best-matching color, not its average", () => {
    // The jacket's black trim should rescue an otherwise clashing pairing.
    const withTrim = outfitColorScore([["#ff0000", "#000000"], ["#00ff00"]]);
    const without = outfitColorScore([["#ff0000"], ["#00ff00"]]);
    expect(withTrim).toBeGreaterThan(without);
  });

  it("returns 1 when there is nothing to compare", () => {
    expect(outfitColorScore([])).toBe(1);
    expect(outfitColorScore([["#ff0000"]])).toBe(1);
    expect(outfitColorScore([["#ff0000"], []])).toBe(1);
  });
});
