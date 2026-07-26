"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import OutfitCollage from "./OutfitCollage";
import { resolveOutfit } from "@/lib/rotation";
import { outfitKey, type Garment, type Outfit } from "@/lib/types";

/** Past either of these, the swipe counts — a fast flick shouldn't need distance. */
const COMMIT_OFFSET = 100;
const COMMIT_VELOCITY = 500;

export default function OutfitDeck({
  outfits,
  garments,
  onSave,
  onClose,
}: {
  outfits: Outfit[];
  garments: Garment[];
  onSave: (o: Outfit) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const saveOpacity = useTransform(x, [40, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -40], [1, 0]);

  const stack = outfits.slice(index, index + 3);

  function commit(direction: 1 | -1) {
    const outfit = outfits[index];
    if (direction === 1 && outfit) onSave(outfit);
    setExitX(direction * 600);
    setIndex((i) => i + 1);
    x.set(0);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const passed =
      Math.abs(info.offset.x) > COMMIT_OFFSET || Math.abs(info.velocity.x) > COMMIT_VELOCITY;
    if (!passed) return; // dragSnapToOrigin springs it home
    commit(info.offset.x > 0 ? 1 : -1);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <p className="font-display text-sm tracking-display">Alternatives</p>
          <p className="text-xs text-ink-2">
            Swipe right to keep, left to skip
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:text-ink"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-8">
        {stack.length === 0 ? (
          <div className="text-center">
            <p className="font-display text-xl tracking-display">That&apos;s the lot</p>
            <p className="mt-2 text-sm text-ink-2">
              A fresh set is picked tomorrow. Add more pieces for more combinations.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-11 rounded-xl bg-accent px-6 text-sm font-medium text-base"
            >
              Back to today
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            <AnimatePresence initial={false}>
              {stack
                .map((outfit, depth) => {
                  const resolved = resolveOutfit(outfit, garments);
                  if (!resolved) return null;
                  const isTop = depth === 0;

                  return (
                    <motion.div
                      key={outfitKey(outfit)}
                      className={isTop ? "no-touch-pan relative z-10" : "absolute inset-0"}
                      style={isTop ? { x, rotate } : undefined}
                      initial={{ scale: 0.9, y: 24, opacity: 0 }}
                      animate={{
                        scale: 1 - depth * 0.05,
                        y: depth * 12,
                        opacity: 1,
                      }}
                      exit={{ x: exitX, opacity: 0, transition: { duration: 0.28 } }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      drag={isTop ? "x" : false}
                      dragSnapToOrigin
                      dragElastic={0.7}
                      onDragEnd={isTop ? handleDragEnd : undefined}
                    >
                      <OutfitCollage
                        top={resolved.top}
                        bottom={resolved.bottom}
                        shoes={resolved.shoes}
                        animate={false}
                      />

                      {isTop && (
                        <>
                          <motion.span
                            style={{ opacity: saveOpacity }}
                            className="pointer-events-none absolute left-5 top-5 rounded-lg border-2 border-accent px-3 py-1 text-sm font-medium tracking-widest text-accent"
                          >
                            SAVE
                          </motion.span>
                          <motion.span
                            style={{ opacity: skipOpacity }}
                            className="pointer-events-none absolute right-5 top-5 rounded-lg border-2 border-ink-2 px-3 py-1 text-sm font-medium tracking-widest text-ink-2"
                          >
                            NEXT
                          </motion.span>
                        </>
                      )}
                    </motion.div>
                  );
                })
                .reverse()}
            </AnimatePresence>
          </div>
        )}
      </div>

      {stack.length > 0 && (
        <div className="flex justify-center gap-3 px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => commit(-1)}
            className="h-12 flex-1 rounded-xl border border-hairline bg-surface text-sm text-ink-2"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => commit(1)}
            className="h-12 flex-1 rounded-xl bg-accent text-sm font-medium text-base"
          >
            Keep this
          </button>
        </div>
      )}
    </div>
  );
}
