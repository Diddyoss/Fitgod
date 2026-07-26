"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Sheet from "./Sheet";
import TagEditor, { type TagDraft } from "./TagEditor";
import GarmentImage from "./GarmentImage";
import { deleteImage } from "@/lib/client/imageStore";
import { deleteGarmentImage } from "@/lib/client/storage";
import { useWardrobe } from "@/store/wardrobe";
import { useOutfits } from "@/store/outfits";
import type { Garment } from "@/lib/types";

export default function GarmentDetailSheet({
  garment,
  onClose,
}: {
  garment: Garment | null;
  onClose: () => void;
}) {
  const updateGarment = useWardrobe((s) => s.updateGarment);
  const removeGarment = useWardrobe((s) => s.removeGarment);
  const forgetGarment = useOutfits((s) => s.forgetGarment);

  const [draft, setDraft] = useState<TagDraft | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!garment) return;
    setConfirming(false);
    setDraft({
      category: garment.category,
      name: garment.name,
      style: garment.style,
      warmth: garment.warmth,
      formality: garment.formality,
    });
  }, [garment]);

  function save() {
    if (!garment || !draft) return;
    updateGarment(garment.id, { ...draft, name: draft.name.trim() || "Untitled" });
    onClose();
  }

  async function remove() {
    if (!garment) return;
    // Store row, then remote object, then the local blob.
    removeGarment(garment.id);
    forgetGarment(garment.id);
    if (garment.imagePath) await deleteGarmentImage(garment.imagePath);
    await deleteImage(garment.id);
    onClose();
  }

  return (
    <Sheet open={Boolean(garment)} onClose={onClose} title={garment?.name ?? "Garment"}>
      {garment && draft && (
        <div className="space-y-5 pb-2">
          <GarmentImage
            garmentId={garment.id}
            alt={garment.name}
            className="max-h-56 w-full rounded-xl object-contain ring-1 ring-hairline"
          />

          {garment.description && (
            <p className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink-2">
              {garment.description}
            </p>
          )}

          <TagEditor value={draft} colors={garment.colors} onChange={setDraft} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="h-12 flex-1 rounded-xl bg-accent text-sm font-medium text-base"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => (confirming ? remove() : setConfirming(true))}
              aria-label={confirming ? "Confirm delete" : "Delete garment"}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm transition-colors ${
                confirming
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-hairline text-ink-2 hover:text-ink"
              }`}
            >
              <Trash2 size={16} />
              {confirming && "Sure?"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
