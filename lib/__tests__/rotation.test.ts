import { describe, expect, it } from "vitest";
import { rankOutfits, resolveOutfit, wardrobeGaps } from "../rotation";
import { outfitKey, type Category, type Garment } from "../types";

let n = 0;
function g(category: Category, over: Partial<Garment> = {}): Garment {
  n++;
  return {
    id: over.id ?? `${category}-${n}`,
    category,
    name: `${category} ${n}`,
    colors: ["#808080"],
    style: "casual",
    warmth: 3,
    formality: 3,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function wardrobe(tops = 3, bottoms = 3, shoes = 2): Garment[] {
  return [
    ...Array.from({ length: tops }, () => g("top")),
    ...Array.from({ length: bottoms }, () => g("bottom")),
    ...Array.from({ length: shoes }, () => g("shoes")),
  ];
}

const USER = "user-1";
const DAY = "2026-07-26";

describe("wardrobeGaps", () => {
  it("names the missing categories", () => {
    expect(wardrobeGaps([g("top")])).toEqual(["bottom", "shoes"]);
    expect(wardrobeGaps([])).toEqual(["top", "bottom", "shoes"]);
  });

  it("returns nothing when all three are covered", () => {
    expect(wardrobeGaps(wardrobe(1, 1, 1))).toEqual([]);
  });
});

describe("rankOutfits — determinism", () => {
  it("returns an identical ranking across repeated calls", () => {
    const w = wardrobe();
    const a = rankOutfits(w, USER, DAY);
    const b = rankOutfits(w, USER, DAY);
    expect(a).toEqual(b);
  });

  it("does not depend on the order garments are supplied in", () => {
    const w = wardrobe(3, 3, 2);
    const shuffled = [...w].reverse();
    const a = rankOutfits(w, USER, DAY).map(outfitKey);
    const b = rankOutfits(shuffled, USER, DAY).map(outfitKey);
    expect(a).toEqual(b);
  });

  it("gives different users different outfits", () => {
    const w = wardrobe(4, 4, 3);
    const a = rankOutfits(w, "user-a", DAY)[0];
    const b = rankOutfits(w, "user-b", DAY)[0];
    expect(outfitKey(a)).not.toBe(outfitKey(b));
  });
});

describe("rankOutfits — daily rotation", () => {
  it("changes the top pick across a week", () => {
    const w = wardrobe(4, 4, 3);
    const picks = [
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
    ].map((d) => outfitKey(rankOutfits(w, USER, d)[0]));

    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it("keeps the same day stable even when called much later", () => {
    const w = wardrobe();
    expect(outfitKey(rankOutfits(w, USER, DAY)[0])).toBe(outfitKey(rankOutfits(w, USER, DAY)[0]));
  });
});

describe("rankOutfits — shape of the result", () => {
  it("returns at most the requested number", () => {
    expect(rankOutfits(wardrobe(5, 5, 5), USER, DAY).length).toBe(8);
    expect(rankOutfits(wardrobe(5, 5, 5), USER, DAY, [], { topN: 3 }).length).toBe(3);
  });

  it("returns fewer when the wardrobe is small", () => {
    expect(rankOutfits(wardrobe(1, 1, 1), USER, DAY).length).toBe(1);
  });

  it("is sorted by descending score", () => {
    const ranked = rankOutfits(wardrobe(4, 4, 3), USER, DAY);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });

  it("only ever pairs one garment per category", () => {
    const w = wardrobe(3, 3, 2);
    const byId = new Map(w.map((x) => [x.id, x]));
    for (const o of rankOutfits(w, USER, DAY)) {
      expect(byId.get(o.topId)!.category).toBe("top");
      expect(byId.get(o.bottomId)!.category).toBe("bottom");
      expect(byId.get(o.shoesId)!.category).toBe("shoes");
    }
  });

  it("returns nothing when a category is empty", () => {
    expect(rankOutfits([g("top"), g("bottom")], USER, DAY)).toEqual([]);
    expect(rankOutfits([], USER, DAY)).toEqual([]);
  });
});

describe("rankOutfits — scoring", () => {
  it("prefers a harmonious outfit over a clashing one", () => {
    const w = [
      g("top", { id: "t-neutral", colors: ["#111114"] }),
      g("top", { id: "t-clash", colors: ["#ff0000"] }),
      g("bottom", { id: "b", colors: ["#00ff00"] }),
      g("shoes", { id: "s", colors: ["#0000ff"] }),
    ];
    const ranked = rankOutfits(w, USER, DAY);
    expect(ranked[0].topId).toBe("t-neutral");
  });

  it("prefers garments of matching formality", () => {
    const w = [
      g("top", { id: "t-match", formality: 4 }),
      g("top", { id: "t-mismatch", formality: 1 }),
      g("bottom", { id: "b", formality: 4 }),
      g("shoes", { id: "s", formality: 4 }),
    ];
    expect(rankOutfits(w, USER, DAY)[0].topId).toBe("t-match");
  });

  it("prefers garments of matching warmth", () => {
    const w = [
      g("top", { id: "t-match", warmth: 5 }),
      g("top", { id: "t-mismatch", warmth: 1 }),
      g("bottom", { id: "b", warmth: 5 }),
      g("shoes", { id: "s", warmth: 5 }),
    ];
    expect(rankOutfits(w, USER, DAY)[0].topId).toBe("t-match");
  });
});

describe("rankOutfits — recency", () => {
  it("demotes an outfit worn yesterday", () => {
    const w = wardrobe(3, 3, 2);
    const clean = rankOutfits(w, USER, DAY);
    const winner = clean[0];

    const worn = rankOutfits(w, USER, DAY, [
      { date: "2026-07-25", garmentIds: [winner.topId, winner.bottomId, winner.shoesId] },
    ]);
    expect(outfitKey(worn[0])).not.toBe(outfitKey(winner));
  });

  it("stops penalising once the combo is old enough", () => {
    const w = wardrobe(3, 3, 2);
    const winner = rankOutfits(w, USER, DAY)[0];
    const ids = [winner.topId, winner.bottomId, winner.shoesId];

    const stale = rankOutfits(w, USER, DAY, [{ date: "2026-06-01", garmentIds: ids }]);
    expect(outfitKey(stale[0])).toBe(outfitKey(winner));
  });

  it("ignores history dated after the target day", () => {
    const w = wardrobe(3, 3, 2);
    const winner = rankOutfits(w, USER, DAY)[0];
    const future = rankOutfits(w, USER, DAY, [
      {
        date: "2026-08-20",
        garmentIds: [winner.topId, winner.bottomId, winner.shoesId],
      },
    ]);
    expect(outfitKey(future[0])).toBe(outfitKey(winner));
  });

  it("penalises the exact combo more heavily than a shared garment", () => {
    const w = wardrobe(3, 3, 2);
    const base = rankOutfits(w, USER, DAY);
    const winner = base[0];
    const ids = [winner.topId, winner.bottomId, winner.shoesId];

    const scoreOf = (ranked: ReturnType<typeof rankOutfits>) =>
      ranked.find((o) => outfitKey(o) === outfitKey(winner))?.score;

    const sharedOnly = rankOutfits(
      w,
      USER,
      DAY,
      [{ date: "2026-07-25", garmentIds: [winner.topId] }],
      { topN: 999 },
    );
    const wholeCombo = rankOutfits(w, USER, DAY, [{ date: "2026-07-25", garmentIds: ids }], {
      topN: 999,
    });

    expect(scoreOf(wholeCombo)!).toBeLessThan(scoreOf(sharedOnly)!);
  });
});

describe("rankOutfits — large wardrobes", () => {
  it("samples deterministically past the combination cap", () => {
    const w = wardrobe(12, 12, 8); // 1152 combos, over the 400 cap
    const a = rankOutfits(w, USER, DAY);
    const b = rankOutfits(w, USER, DAY);
    expect(a).toEqual(b);
    expect(a.length).toBe(8);
  });

  it("still returns valid combinations when sampling", () => {
    const w = wardrobe(12, 12, 8);
    const ids = new Set(w.map((x) => x.id));
    for (const o of rankOutfits(w, USER, DAY)) {
      expect(ids.has(o.topId)).toBe(true);
      expect(ids.has(o.bottomId)).toBe(true);
      expect(ids.has(o.shoesId)).toBe(true);
    }
  });

  it("respects a custom cap", () => {
    const w = wardrobe(10, 10, 10);
    const ranked = rankOutfits(w, USER, DAY, [], { maxCombos: 20, topN: 999 });
    expect(ranked.length).toBe(20);
  });
});

describe("resolveOutfit", () => {
  it("returns the three garments", () => {
    const w = wardrobe(1, 1, 1);
    const outfit = rankOutfits(w, USER, DAY)[0];
    const resolved = resolveOutfit(outfit, w);
    expect(resolved).not.toBeNull();
    expect(resolved!.top.category).toBe("top");
    expect(resolved!.bottom.category).toBe("bottom");
    expect(resolved!.shoes.category).toBe("shoes");
  });

  it("returns null when a garment has since been deleted", () => {
    const w = wardrobe(1, 1, 1);
    const outfit = rankOutfits(w, USER, DAY)[0];
    const without = w.filter((x) => x.id !== outfit.topId);
    expect(resolveOutfit(outfit, without)).toBeNull();
  });
});
