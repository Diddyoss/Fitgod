"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Heart, Shuffle } from "lucide-react";
import OutfitCollage, { type SlotPosition } from "@/components/OutfitCollage";
import OutfitDeck from "@/components/OutfitDeck";
import { useWardrobe } from "@/store/wardrobe";
import { useOutfits } from "@/store/outfits";
import { rankOutfits, resolveOutfit, wardrobeGaps } from "@/lib/rotation";
import { formatLongDate, todayISO } from "@/lib/dates";
import { fetchStylingNote, type StylingNote } from "@/lib/client/ai";
import { CATEGORIES, CATEGORY_LABEL, outfitKey, type Category, type Outfit } from "@/lib/types";

export default function TodayPage() {
  const garments = useWardrobe((s) => s.garments);
  const ensureUserId = useWardrobe((s) => s.ensureUserId);

  const history = useOutfits((s) => s.history);
  const chosenForDate = useOutfits((s) => s.chosenForDate);
  const saved = useOutfits((s) => s.saved);
  const markWorn = useOutfits((s) => s.markWorn);
  const chooseForDate = useOutfits((s) => s.chooseForDate);
  const saveOutfit = useOutfits((s) => s.saveOutfit);
  const unsaveOutfit = useOutfits((s) => s.unsaveOutfit);

  const [date] = useState(todayISO);
  const [deckOpen, setDeckOpen] = useState(false);
  const [note, setNote] = useState<StylingNote | null>(null);
  const [noteLoading, setNoteLoading] = useState(true);

  const userId = useWardrobe((s) => s.userId) ?? "anonymous";
  const gaps = useMemo(() => wardrobeGaps(garments), [garments]);

  const ranked = useMemo(
    () => rankOutfits(garments, userId, date, history),
    [garments, userId, date, history],
  );

  // A swipe-accepted alternative overrides the day's rank-1 pick.
  const outfit: Outfit | null = useMemo(() => {
    const override = chosenForDate[date];
    if (override) {
      const [topId, bottomId, shoesId] = override;
      return { topId, bottomId, shoesId, score: 0 };
    }
    return ranked[0] ?? null;
  }, [chosenForDate, date, ranked]);

  const resolved = useMemo(
    () => (outfit ? resolveOutfit(outfit, garments) : null),
    [outfit, garments],
  );

  const byCategory = useMemo(
    () => ({
      top: garments.filter((g) => g.category === "top"),
      bottom: garments.filter((g) => g.category === "bottom"),
      shoes: garments.filter((g) => g.category === "shoes"),
    }),
    [garments],
  );

  const idFor = (o: Outfit, c: Category) =>
    c === "top" ? o.topId : c === "bottom" ? o.bottomId : o.shoesId;

  const positions = useMemo(() => {
    if (!outfit) return undefined;
    const out: Partial<Record<Category, SlotPosition>> = {};
    for (const c of CATEGORIES) {
      const list = byCategory[c];
      const i = list.findIndex((g) => g.id === idFor(outfit, c));
      out[c] = { index: i < 0 ? 0 : i, total: list.length };
    }
    return out;
  }, [outfit, byCategory]);

  /** Swiping one piece swaps just that slot, wrapping around its category. */
  const cyclePiece = useCallback(
    (category: Category, direction: 1 | -1) => {
      if (!outfit) return;
      const list = byCategory[category];
      if (list.length < 2) return;

      const i = list.findIndex((g) => g.id === idFor(outfit, category));
      const nextIndex = (((i < 0 ? 0 : i) + direction) % list.length + list.length) % list.length;
      const nextId = list[nextIndex].id;

      chooseForDate(date, {
        topId: category === "top" ? nextId : outfit.topId,
        bottomId: category === "bottom" ? nextId : outfit.bottomId,
        shoesId: category === "shoes" ? nextId : outfit.shoesId,
        score: 0,
      });
    },
    [outfit, byCategory, chooseForDate, date],
  );

  const canSwapAny = CATEGORIES.some((c) => byCategory[c].length > 1);

  const isSaved = outfit ? saved.some((o) => outfitKey(o) === outfitKey(outfit)) : false;
  const wornToday = history.some((h) => h.date === date);

  useEffect(() => {
    if (!resolved) return;
    let live = true;
    setNoteLoading(true);
    fetchStylingNote({
      userId: ensureUserId(),
      date,
      outfit: [resolved.top, resolved.bottom, resolved.shoes].map((g) => ({
        name: g.name,
        colors: g.colors,
        style: g.style,
      })),
    }).then((n) => {
      if (!live) return;
      setNote(n);
      setNoteLoading(false);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the outfit, not the object identity
  }, [resolved && outfitKey(outfit!), date]);

  if (gaps.length > 0) {
    return (
      <>
        <h1 className="font-display text-3xl tracking-display">Today</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-hairline px-6 py-12 text-center">
          <p className="text-sm text-ink-2">
            Add {gaps.map((g) => CATEGORY_LABEL[g].toLowerCase()).join(" and ")} before Fitgod can
            build an outfit.
          </p>
          <Link
            href="/wardrobe"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-medium text-base"
          >
            Go to wardrobe
          </Link>
        </div>
      </>
    );
  }

  if (!resolved || !outfit) {
    return (
      <>
        <h1 className="font-display text-3xl tracking-display">Today</h1>
        <div className="skeleton mt-6 aspect-[3/4] w-full rounded-3xl" />
      </>
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">
          {formatLongDate(date)}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-display">
          {note?.vibe || "Today's fit"}
        </h1>
      </header>

      <OutfitCollage
        top={resolved.top}
        bottom={resolved.bottom}
        shoes={resolved.shoes}
        onCycle={cyclePiece}
        positions={positions}
      />

      {canSwapAny && (
        <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-ink-2">
          Swipe a piece to swap it
        </p>
      )}

      <div className="mt-4 min-h-[2.5rem]">
        {noteLoading ? (
          <div className="skeleton h-4 w-3/4" />
        ) : note ? (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm leading-relaxed text-ink-2"
          >
            {note.note}
          </motion.p>
        ) : (
          <p className="text-sm text-ink-2">
            {resolved.top.name}, {resolved.bottom.name}, {resolved.shoes.name}.
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => markWorn(date, outfit)}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${
            wornToday
              ? "border border-accent-muted bg-accent-muted/20 text-accent"
              : "bg-accent text-base"
          }`}
        >
          <Check size={18} /> {wornToday ? "Worn today" : "Wear it"}
        </button>
        <button
          type="button"
          onClick={() => (isSaved ? unsaveOutfit(outfit) : saveOutfit(outfit))}
          aria-label={isSaved ? "Remove from saved" : "Save this outfit"}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
            isSaved ? "border-accent text-accent" : "border-hairline text-ink-2 hover:text-ink"
          }`}
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => setDeckOpen(true)}
          aria-label="Shuffle alternatives"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-hairline text-ink-2 hover:text-ink"
        >
          <Shuffle size={18} />
        </button>
      </div>

      {deckOpen && (
        <OutfitDeck
          outfits={ranked.slice(1)}
          garments={garments}
          onSave={(o) => {
            saveOutfit(o);
            chooseForDate(date, o);
          }}
          onClose={() => setDeckOpen(false)}
        />
      )}
    </>
  );
}
