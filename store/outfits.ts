"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { outfitKey, type Outfit, type OutfitHistoryEntry } from "@/lib/types";

const HISTORY_CAP = 30;

interface OutfitState {
  history: OutfitHistoryEntry[];
  saved: Outfit[];
  /** Set when the user swipe-accepts an alternative, overriding the day's rank-1 pick. */
  chosenForDate: Record<string, string[]>;
  hydrated: boolean;

  setHydrated: () => void;
  markWorn: (dateISO: string, outfit: Outfit) => void;
  chooseForDate: (dateISO: string, outfit: Outfit) => void;
  saveOutfit: (outfit: Outfit) => void;
  unsaveOutfit: (outfit: Outfit) => void;
  isSaved: (outfit: Outfit) => boolean;
  forgetGarment: (garmentId: string) => void;
  clear: () => void;
}

export const useOutfits = create<OutfitState>()(
  persist(
    (set, get) => ({
      history: [],
      saved: [],
      chosenForDate: {},
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      markWorn: (dateISO, outfit) =>
        set((s) => {
          const ids = [outfit.topId, outfit.bottomId, outfit.shoesId];
          const rest = s.history.filter((h) => h.date !== dateISO);
          return {
            history: [{ date: dateISO, garmentIds: ids }, ...rest].slice(0, HISTORY_CAP),
          };
        }),

      chooseForDate: (dateISO, outfit) =>
        set((s) => ({
          chosenForDate: {
            ...s.chosenForDate,
            [dateISO]: [outfit.topId, outfit.bottomId, outfit.shoesId],
          },
        })),

      saveOutfit: (outfit) =>
        set((s) =>
          s.saved.some((o) => outfitKey(o) === outfitKey(outfit))
            ? s
            : { saved: [outfit, ...s.saved] },
        ),

      unsaveOutfit: (outfit) =>
        set((s) => ({ saved: s.saved.filter((o) => outfitKey(o) !== outfitKey(outfit)) })),

      isSaved: (outfit) => get().saved.some((o) => outfitKey(o) === outfitKey(outfit)),

      // Called when a garment is deleted, so nothing dangles.
      forgetGarment: (garmentId) =>
        set((s) => ({
          saved: s.saved.filter(
            (o) => ![o.topId, o.bottomId, o.shoesId].includes(garmentId),
          ),
          history: s.history
            .map((h) => ({ ...h, garmentIds: h.garmentIds.filter((id) => id !== garmentId) }))
            .filter((h) => h.garmentIds.length > 0),
          chosenForDate: Object.fromEntries(
            Object.entries(s.chosenForDate).filter(([, ids]) => !ids.includes(garmentId)),
          ),
        })),

      clear: () => set({ history: [], saved: [], chosenForDate: {} }),
    }),
    {
      name: "fitgod-outfits",
      partialize: (s) => ({
        history: s.history,
        saved: s.saved,
        chosenForDate: s.chosenForDate,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
