"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import Link from "next/link";
import OutfitCollage from "@/components/OutfitCollage";
import { useOutfits } from "@/store/outfits";
import { useWardrobe } from "@/store/wardrobe";
import { resolveOutfit } from "@/lib/rotation";
import { todayISO } from "@/lib/dates";
import { outfitKey } from "@/lib/types";

export default function SavedPage() {
  const garments = useWardrobe((s) => s.garments);
  const saved = useOutfits((s) => s.saved);
  const unsaveOutfit = useOutfits((s) => s.unsaveOutfit);
  const chooseForDate = useOutfits((s) => s.chooseForDate);

  const rows = saved
    .map((outfit) => ({ outfit, resolved: resolveOutfit(outfit, garments) }))
    .filter((r) => r.resolved !== null);

  return (
    <>
      <header className="mb-5">
        <h1 className="font-display text-3xl tracking-display">Saved</h1>
        <p className="mt-1 text-sm text-ink-2">
          {rows.length} {rows.length === 1 ? "outfit" : "outfits"}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
          <p className="text-sm text-ink-2">
            Nothing saved yet. Swipe right on an alternative, or tap the heart on today&apos;s fit.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-medium text-base"
          >
            Back to today
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {rows.map(({ outfit, resolved }, i) => (
            <motion.li
              key={outfitKey(outfit)}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: i * 0.04 }}
            >
              <OutfitCollage
                top={resolved!.top}
                bottom={resolved!.bottom}
                shoes={resolved!.shoes}
                animate={false}
              />
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => chooseForDate(todayISO(), outfit)}
                  className="h-9 flex-1 rounded-lg border border-hairline bg-surface text-xs text-ink-2 hover:text-ink"
                >
                  Wear today
                </button>
                <button
                  type="button"
                  onClick={() => unsaveOutfit(outfit)}
                  aria-label="Remove from saved"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-accent"
                >
                  <Heart size={14} fill="currentColor" />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}
