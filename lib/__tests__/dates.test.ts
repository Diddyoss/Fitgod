import { describe, expect, it } from "vitest";
import { daysBetween, todayISO } from "../dates";

describe("todayISO", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 6, 26))).toBe("2026-07-26");
  });

  it("zero-pads single digits", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses local time, not UTC", () => {
    // Late evening local would roll over to tomorrow if this used toISOString().
    const d = new Date(2026, 6, 26, 23, 30);
    expect(todayISO(d)).toBe("2026-07-26");
  });

  it("matches the shape the rest of the app expects", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysBetween", () => {
  it("counts forward", () => {
    expect(daysBetween("2026-07-25", "2026-07-26")).toBe(1);
    expect(daysBetween("2026-07-26", "2026-07-26")).toBe(0);
  });

  it("goes negative when b is earlier", () => {
    expect(daysBetween("2026-07-26", "2026-07-25")).toBe(-1);
  });

  it("crosses months and years", () => {
    expect(daysBetween("2026-07-31", "2026-08-01")).toBe(1);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("survives a daylight-saving boundary", () => {
    // Whatever the local DST rules, whole days must stay whole.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});
