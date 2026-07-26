"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import Sheet from "./Sheet";
import TagEditor, { type TagDraft } from "./TagEditor";
import { processImage } from "@/lib/client/image";
import { putImage } from "@/lib/client/imageStore";
import { dominantColors } from "@/lib/palette";
import { analyzeGarment } from "@/lib/client/ai";
import { useWardrobe } from "@/store/wardrobe";
import type { Garment } from "@/lib/types";

const EMPTY: TagDraft = {
  category: "top",
  name: "",
  style: "casual",
  warmth: 3,
  formality: 3,
};

export default function AddGarmentSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const addGarment = useWardrobe((s) => s.addGarment);
  const ensureUserId = useWardrobe((s) => s.ensureUserId);

  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [draft, setDraft] = useState<TagDraft>(EMPTY);
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBlob(null);
    setColors([]);
    setDraft(EMPTY);
    setContext("");
    setNotice(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so re-picking the same file fires change again
    if (!file) return;

    setBusy(true);
    setNotice(null);
    try {
      const processed = await processImage(file);
      setBlob(processed.blob);
      setPreview(URL.createObjectURL(processed.blob));

      // Colors come from the pixels, never from the model.
      const palette = dominantColors(processed.pixels, 3);
      setColors(palette);

      const analysis = await analyzeGarment({
        userId: ensureUserId(),
        image: processed.base64,
        mediaType: processed.mediaType,
        context: context.trim() || undefined,
      });

      if (analysis) {
        setDraft({
          category: analysis.category,
          name: analysis.name,
          style: analysis.style,
          warmth: analysis.warmth,
          formality: analysis.formality,
        });
        if (analysis.confidence === "low") {
          setNotice("The model wasn't confident — worth a check.");
        }
      } else {
        setNotice("Tagging is unavailable, so fill these in yourself.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!blob) return;
    const garment: Garment = {
      id: crypto.randomUUID(),
      category: draft.category,
      name: draft.name.trim() || "Untitled",
      colors,
      style: draft.style,
      warmth: draft.warmth,
      formality: draft.formality,
      description: context.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await putImage(garment.id, blob);
    addGarment(garment);
    close();
  }

  return (
    <Sheet open={open} onClose={close} title="Add a garment">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {!preview ? (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-2">
            Photograph the item flat against a plain background. Colors are measured from the
            photo; the rest is auto-tagged.
          </p>

          <label
            htmlFor="garment-context"
            className="mt-4 block text-[11px] uppercase tracking-widest text-ink-2"
          >
            Anything worth knowing? (optional)
          </label>
          <textarea
            id="garment-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Heavy wool, runs oversized"
            className="w-full resize-none rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-2/60 focus:border-accent focus:outline-none"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-medium text-base"
            >
              <Camera size={18} /> Camera
            </button>
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-surface text-sm text-ink"
            >
              <ImagePlus size={18} /> Library
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 pb-2">
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL */}
            <img
              src={preview}
              alt="The garment you just added"
              className="h-28 w-28 shrink-0 rounded-xl object-cover ring-1 ring-hairline"
            />
            <div className="flex flex-col justify-center gap-2">
              {busy && (
                <span className="flex items-center gap-2 text-xs text-ink-2">
                  <Loader2 size={14} className="animate-spin" /> Reading the photo…
                </span>
              )}
              {notice && <span className="text-xs text-ink-2">{notice}</span>}
              <button
                type="button"
                onClick={reset}
                className="self-start text-xs text-accent underline underline-offset-4"
              >
                Use a different photo
              </button>
            </div>
          </div>

          <TagEditor value={draft} colors={colors} onChange={setDraft} />

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="h-12 w-full rounded-xl bg-accent text-sm font-medium text-base disabled:opacity-40"
          >
            Add to wardrobe
          </button>
        </div>
      )}
    </Sheet>
  );
}
