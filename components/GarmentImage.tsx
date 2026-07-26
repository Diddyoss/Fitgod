"use client";

import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/client/imageStore";

/**
 * Renders a garment photo from IndexedDB. Falls back to a flat surface tile
 * when the blob is missing (deleted, or not yet restored on a new device).
 */
export default function GarmentImage({
  garmentId,
  alt,
  className = "",
}: {
  garmentId: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    getImageUrl(garmentId).then((u) => {
      if (!live) return;
      if (u) setUrl(u);
      else setMissing(true);
    });
    return () => {
      live = false;
    };
  }, [garmentId]);

  if (missing) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-hi text-[10px] uppercase tracking-widest text-ink-2 ${className}`}
        aria-label={alt}
      >
        no photo
      </div>
    );
  }

  if (!url) return <div className={`skeleton ${className}`} aria-hidden />;

  // eslint-disable-next-line @next/next/no-img-element -- blob: URLs, not remote assets
  return <img src={url} alt={alt} className={className} draggable={false} />;
}
