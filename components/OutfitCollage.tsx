"use client";

import { motion } from "framer-motion";
import GarmentImage from "./GarmentImage";
import SilhouetteSvg from "./SilhouetteSvg";
import type { Garment } from "@/lib/types";

/**
 * Flat-lay: the user's own garment photos, arranged anatomically over a faint
 * silhouette. Frames are cover-cropped rather than background-removed — at this
 * size the crop reads clean, and background removal is a v2 concern.
 */
const PIECES = [
  { key: "top", top: "7%", width: "58%", left: "21%", rotate: -3 },
  { key: "bottom", top: "37%", width: "50%", left: "25%", rotate: 2 },
  { key: "shoes", top: "72%", width: "38%", left: "31%", rotate: -2 },
] as const;

export default function OutfitCollage({
  top,
  bottom,
  shoes,
  animate = true,
  className = "",
}: {
  top: Garment;
  bottom: Garment;
  shoes: Garment;
  animate?: boolean;
  className?: string;
}) {
  const garments = { top, bottom, shoes };

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-hairline bg-surface ${className}`}
    >
      <SilhouetteSvg className="absolute inset-0 h-full w-full opacity-60" />

      {PIECES.map((piece, i) => {
        const garment = garments[piece.key];
        return (
          <motion.div
            key={piece.key}
            className="absolute"
            style={{ top: piece.top, left: piece.left, width: piece.width }}
            initial={animate ? { opacity: 0, scale: 0.9, y: 16 } : false}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: piece.rotate }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: animate ? i * 0.08 : 0,
            }}
          >
            <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-hairline">
              <GarmentImage
                garmentId={garment.id}
                alt={garment.name}
                className="aspect-square w-full object-cover"
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
