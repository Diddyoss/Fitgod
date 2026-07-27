"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import BodyPortal from "@/components/BodyPortal";
import SectionHeading from "@/components/SectionHeading";
import WaterfallGrid from "@/components/WaterfallGrid";
import GarmentCard from "@/components/GarmentCard";
import AddGarmentSheet from "@/components/AddGarmentSheet";
import GarmentDetailSheet from "@/components/GarmentDetailSheet";
import { useWardrobe } from "@/store/wardrobe";
import { CATEGORIES, CATEGORY_LABEL, type Category, type Garment } from "@/lib/types";

type Filter = Category | "all";

export default function WardrobePage() {
  const garments = useWardrobe((s) => s.garments);
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Garment | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? garments : garments.filter((g) => g.category === filter)),
    [garments, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: garments.length };
    for (const cat of CATEGORIES) c[cat] = garments.filter((g) => g.category === cat).length;
    return c;
  }, [garments]);

  return (
    <>
      <header className="mb-5">
        <h1 className="font-display text-3xl tracking-display">Wardrobe</h1>
        <p className="mt-1 text-sm text-ink-2">
          {garments.length} {garments.length === 1 ? "piece" : "pieces"}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(["all", ...CATEGORIES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`h-9 rounded-full border px-3 text-xs transition-colors ${
              filter === f
                ? "border-accent bg-accent-muted/30 text-accent"
                : "border-hairline bg-surface text-ink-2 hover:border-ink-2"
            }`}
          >
            {f === "all" ? "All" : CATEGORY_LABEL[f]}
            <span className="ml-1.5 opacity-60">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
          <p className="text-sm text-ink-2">
            {garments.length === 0
              ? "Nothing here yet. Add a few tops, bottoms and shoes."
              : `No ${filter === "all" ? "items" : CATEGORY_LABEL[filter as Category].toLowerCase()} yet.`}
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 h-11 rounded-xl bg-accent px-5 text-sm font-medium text-base"
          >
            Add a garment
          </button>
        </div>
      ) : (
        <>
          <SectionHeading>{filter === "all" ? "Everything" : CATEGORY_LABEL[filter as Category]}</SectionHeading>
          <WaterfallGrid>
            {visible.map((g) => (
              <GarmentCard key={g.id} garment={g} onClick={() => setSelected(g)} />
            ))}
          </WaterfallGrid>
        </>
      )}

      <BodyPortal>
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 flex justify-center">
          <div className="flex w-full max-w-md justify-end px-5 sm:max-w-lg md:max-w-2xl">
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label="Add a garment"
              className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-base shadow-lg shadow-black/40"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </BodyPortal>

      <AddGarmentSheet open={adding} onClose={() => setAdding(false)} />
      <GarmentDetailSheet garment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
