"use client";

import { motion, type PanInfo } from "framer-motion";
import GarmentImage from "./GarmentImage";
import type { Category, Garment } from "@/lib/types";

/**
 * The outfit as it would hang: top, bottom, shoes stacked in a column, each in
 * its own band so nothing overlaps. Garment photos are background-removed and
 * trimmed on upload, so the pieces read as a single figure without needing a
 * silhouette behind them.
 *
 * When `onCycle` is supplied each band becomes independently swipeable —
 * dragging one piece sideways moves to the next garment in that category.
 */

const BANDS = [
  { key: "top" as const, height: "40%" },
  { key: "bottom" as const, height: "38%" },
  { key: "shoes" as const, height: "22%" },
];

/** Lower than the deck's threshold — these are smaller targets. */
const COMMIT_OFFSET = 60;
const COMMIT_VELOCITY = 400;

export interface SlotPosition {
  index: number;
  total: number;
}

export default function OutfitCollage({
  top,
  bottom,
  shoes,
  animate = true,
  className = "",
  onCycle,
  positions,
}: {
  top: Garment;
  bottom: Garment;
  shoes: Garment;
  animate?: boolean;
  className?: string;
  onCycle?: (category: Category, direction: 1 | -1) => void;
  positions?: Partial<Record<Category, SlotPosition>>;
}) {
  const garments = { top, bottom, shoes };

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-hairline bg-surface ${className}`}
      style={{ aspectRatio: "3 / 4" }}
    >
      {BANDS.map((band, i) => {
        const garment = garments[band.key];
        const pos = positions?.[band.key];
        const swipeable = Boolean(onCycle) && (pos?.total ?? 0) > 1;

        return (
          <motion.div
            key={band.key}
            className={`relative flex items-center justify-center px-4 ${
              swipeable ? "no-touch-pan cursor-grab active:cursor-grabbing" : ""
            }`}
            style={{ height: band.height }}
            drag={swipeable ? "x" : false}
            dragSnapToOrigin
            dragElastic={0.5}
            dragMomentum={false}
            onDragEnd={
              swipeable
                ? (_: unknown, info: PanInfo) => {
                    const passed =
                      Math.abs(info.offset.x) > COMMIT_OFFSET ||
                      Math.abs(info.velocity.x) > COMMIT_VELOCITY;
                    if (passed) onCycle?.(band.key, info.offset.x > 0 ? 1 : -1);
                  }
                : undefined
            }
          >
            {/* Keyed on the garment so swapping a piece replays the entrance. */}
            <motion.div
              key={garment.id}
              className="flex h-full w-full items-center justify-center"
              initial={animate ? { opacity: 0, scale: 0.94, y: 10 } : false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                delay: animate ? i * 0.07 : 0,
              }}
            >
              <GarmentImage
                garmentId={garment.id}
                alt={garment.name}
                className="max-h-full max-w-full object-contain drop-shadow-lg"
              />
            </motion.div>

            {pos && pos.total > 1 && (
              <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-1">
                {Array.from({ length: Math.min(pos.total, 6) }).map((_, d) => (
                  <span
                    key={d}
                    className={`h-1 w-1 rounded-full transition-colors ${
                      d === pos.index % 6 ? "bg-accent" : "bg-hairline"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
