import { describe, expect, it } from "vitest";
import { daySeed, fnv1a, mulberry32 } from "../seed";

describe("fnv1a", () => {
  it("is deterministic", () => {
    expect(fnv1a("hoodie")).toBe(fnv1a("hoodie"));
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const s of ["", "a", "the quick brown fox", "🧥"]) {
      const h = fnv1a(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it("separates similar inputs", () => {
    expect(fnv1a("a|b|c")).not.toBe(fnv1a("a|b|d"));
    expect(fnv1a("ab")).not.toBe(fnv1a("ba"));
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("stays within [0, 1)", () => {
    const rnd = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform", () => {
    const rnd = mulberry32(7);
    let sum = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) sum += rnd();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });

  it("tolerates a negative seed from XOR", () => {
    const rnd = mulberry32(-98765);
    const v = rnd();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe("daySeed", () => {
  it("is stable for the same user and date", () => {
    expect(daySeed("u1", "2026-07-26")).toBe(daySeed("u1", "2026-07-26"));
  });

  it("differs across days and across users", () => {
    expect(daySeed("u1", "2026-07-26")).not.toBe(daySeed("u1", "2026-07-27"));
    expect(daySeed("u1", "2026-07-26")).not.toBe(daySeed("u2", "2026-07-26"));
  });
});
