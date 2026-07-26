"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Garment } from "@/lib/types";

interface WardrobeState {
  garments: Garment[];
  userId: string | null;
  /** False until zustand has read localStorage — gates render to avoid flicker. */
  hydrated: boolean;

  setHydrated: () => void;
  ensureUserId: () => string;
  setUserId: (id: string) => void;
  addGarment: (g: Garment) => void;
  updateGarment: (id: string, patch: Partial<Garment>) => void;
  removeGarment: (id: string) => void;
  replaceAll: (garments: Garment[]) => void;
  clear: () => void;
}

export const useWardrobe = create<WardrobeState>()(
  persist(
    (set, get) => ({
      garments: [],
      userId: null,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      ensureUserId: () => {
        const existing = get().userId;
        if (existing) return existing;
        const id = crypto.randomUUID();
        set({ userId: id });
        return id;
      },

      setUserId: (id) => set({ userId: id }),

      addGarment: (g) => set((s) => ({ garments: [g, ...s.garments] })),

      updateGarment: (id, patch) =>
        set((s) => ({
          garments: s.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      removeGarment: (id) => set((s) => ({ garments: s.garments.filter((g) => g.id !== id) })),

      replaceAll: (garments) => set({ garments }),

      clear: () => set({ garments: [] }),
    }),
    {
      name: "fitgod-wardrobe",
      partialize: (s) => ({ garments: s.garments, userId: s.userId }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
