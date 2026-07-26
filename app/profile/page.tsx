"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeading from "@/components/SectionHeading";
import { useWardrobe } from "@/store/wardrobe";
import { useOutfits } from "@/store/outfits";
import { isSupabaseConfigured } from "@/lib/supabaseBrowser";
import { deleteImage } from "@/lib/client/imageStore";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const garments = useWardrobe((s) => s.garments);
  const clearWardrobe = useWardrobe((s) => s.clear);
  const history = useOutfits((s) => s.history);
  const saved = useOutfits((s) => s.saved);
  const clearOutfits = useOutfits((s) => s.clear);

  const [confirming, setConfirming] = useState(false);
  const synced = isSupabaseConfigured();

  async function clearAll() {
    for (const g of garments) await deleteImage(g.id);
    clearWardrobe();
    clearOutfits();
    router.replace("/onboarding");
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-display">You</h1>
      </header>

      <SectionHeading>Wardrobe</SectionHeading>
      <ul className="mb-8 grid grid-cols-3 gap-2">
        {CATEGORIES.map((c) => (
          <li key={c} className="rounded-xl border border-hairline bg-surface px-3 py-4 text-center">
            <p className="font-display text-2xl tracking-display">
              {garments.filter((g) => g.category === c).length}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-widest text-ink-2">
              {CATEGORY_LABEL[c]}
            </p>
          </li>
        ))}
      </ul>

      <SectionHeading>Activity</SectionHeading>
      <dl className="mb-8 space-y-2 text-sm">
        <div className="flex justify-between rounded-xl border border-hairline bg-surface px-4 py-3">
          <dt className="text-ink-2">Outfits saved</dt>
          <dd>{saved.length}</dd>
        </div>
        <div className="flex justify-between rounded-xl border border-hairline bg-surface px-4 py-3">
          <dt className="text-ink-2">Days logged</dt>
          <dd>{history.length}</dd>
        </div>
        <div className="flex justify-between rounded-xl border border-hairline bg-surface px-4 py-3">
          <dt className="text-ink-2">Sync</dt>
          <dd className={synced ? "text-accent" : "text-ink-2"}>
            {synced ? "Supabase" : "This device only"}
          </dd>
        </div>
      </dl>

      <SectionHeading>Danger zone</SectionHeading>
      <button
        type="button"
        onClick={() => (confirming ? clearAll() : setConfirming(true))}
        className={`h-12 w-full rounded-xl border text-sm transition-colors ${
          confirming
            ? "border-red-500 bg-red-500/10 text-red-400"
            : "border-hairline text-ink-2 hover:text-ink"
        }`}
      >
        {confirming ? "Tap again to erase everything" : "Clear all data"}
      </button>
      {confirming && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mt-2 h-11 w-full text-xs text-ink-2"
        >
          Cancel
        </button>
      )}
    </>
  );
}
