"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import AddGarmentSheet from "@/components/AddGarmentSheet";
import { useWardrobe } from "@/store/wardrobe";
import { getSupabase } from "@/lib/supabaseBrowser";
import { uploadGarmentImage } from "@/lib/client/storage";
import { getImageBlob } from "@/lib/client/imageStore";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";

const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function OnboardingPage() {
  const router = useRouter();
  const garments = useWardrobe((s) => s.garments);
  const ensureUserId = useWardrobe((s) => s.ensureUserId);
  const setUserId = useWardrobe((s) => s.setUserId);
  const updateGarment = useWardrobe((s) => s.updateGarment);

  const [step, setStep] = useState<0 | 1>(0);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const have = new Set(garments.map((g) => g.category));
  const ready = CATEGORIES.every((c) => have.has(c));

  async function finish() {
    setFinishing(true);
    let userId = ensureUserId();

    // Anonymous sign-in happens once, at the end — not on first paint.
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase.auth.signInAnonymously();
        if (data?.user) {
          userId = data.user.id;
          setUserId(userId);
          await supabase.from("profiles").upsert({ id: userId });

          // Backfill anything added before we had an account.
          for (const g of garments) {
            const blob = await getImageBlob(g.id);
            if (!blob) continue;
            const path = await uploadGarmentImage(userId, g.id, blob);
            if (path) updateGarment(g.id, { imagePath: path });
            await supabase.from("garments").upsert({
              id: g.id,
              user_id: userId,
              category: g.category,
              name: g.name,
              colors: g.colors,
              style: g.style,
              warmth: g.warmth,
              formality: g.formality,
              description: g.description ?? null,
              image_path: path,
            });
          }
        }
      } catch {
        // Local-only is a perfectly good outcome.
      }
    }

    router.replace("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="intro" {...stepMotion}>
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-accent">Fitgod</p>
            <h1 className="font-display text-4xl leading-tight tracking-display">
              Your wardrobe,
              <br />
              rotated daily.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Photograph what you own. Every morning you get one outfit, chosen from your own
              clothes — different each day, never the same combination twice in a week.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-medium text-base"
            >
              Start <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.div key="upload" {...stepMotion}>
            <h1 className="font-display text-3xl tracking-display">Add one of each</h1>
            <p className="mt-2 text-sm text-ink-2">
              A top, a bottom and a pair of shoes is enough to start. Add more whenever.
            </p>

            <ul className="mt-7 space-y-2">
              {CATEGORIES.map((c) => {
                const done = have.has(c);
                return (
                  <li
                    key={c}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors ${
                      done ? "border-accent-muted bg-accent-muted/10" : "border-hairline bg-surface"
                    }`}
                  >
                    <span className={done ? "text-sm text-accent" : "text-sm text-ink-2"}>
                      {CATEGORY_LABEL[c]}
                    </span>
                    {done ? (
                      <Check size={18} className="text-accent" />
                    ) : (
                      <span className="text-xs text-ink-2">
                        {garments.filter((g) => g.category === c).length}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-6 h-12 w-full rounded-xl border border-hairline bg-surface text-sm text-ink"
            >
              Add a garment
            </button>

            <button
              type="button"
              onClick={finish}
              disabled={!ready || finishing}
              className="mt-2 h-12 w-full rounded-xl bg-accent text-sm font-medium text-base disabled:opacity-30"
            >
              {finishing ? "Setting up…" : "Done"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AddGarmentSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
