"use client";

import type { Garment } from "@/lib/types";
import GarmentImage from "./GarmentImage";

export default function GarmentCard({
  garment,
  onClick,
}: {
  garment: Garment;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-2xl border border-hairline bg-surface text-left transition-colors hover:border-accent-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <GarmentImage
        garmentId={garment.id}
        alt={garment.name}
        className="w-full object-cover"
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex shrink-0 gap-1">
          {garment.colors.slice(0, 3).map((c) => (
            <span
              key={c}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-hairline"
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="truncate text-xs text-ink-2 group-hover:text-ink">{garment.name}</span>
      </div>
    </button>
  );
}
