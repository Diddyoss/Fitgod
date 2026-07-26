"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseBrowser";
import { getImageBlob, hasImage } from "@/lib/client/imageStore";
import { restoreGarmentImage, uploadGarmentImage } from "@/lib/client/storage";
import { useWardrobe } from "@/store/wardrobe";
import type { Category, Garment, Style } from "@/lib/types";

interface Row {
  id: string;
  category: string;
  name: string;
  colors: unknown;
  style: string;
  warmth: number;
  formality: number;
  description: string | null;
  image_path: string | null;
  created_at: string;
}

function toGarment(r: Row): Garment {
  return {
    id: r.id,
    category: r.category as Category,
    name: r.name,
    colors: Array.isArray(r.colors) ? (r.colors as string[]) : [],
    style: r.style as Style,
    warmth: r.warmth,
    formality: r.formality,
    description: r.description ?? undefined,
    imagePath: r.image_path ?? undefined,
    createdAt: r.created_at,
  };
}

/**
 * Reconciles the local wardrobe with Supabase once per load. Last-write-wins,
 * single-device-primary — enough for v1. No-ops entirely when Supabase isn't
 * configured, which is the default local-only path.
 */
export default function SyncBoot() {
  const hydrated = useWardrobe((s) => s.hydrated);
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    ran.current = true;

    const supabase = getSupabase();
    if (!supabase) return;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) return;

        const store = useWardrobe.getState();
        store.setUserId(user.id);

        const { data, error } = await supabase
          .from("garments")
          .select("*")
          .eq("user_id", user.id);
        if (error) return;

        const remote = (data ?? []).map((r) => toGarment(r as Row));
        const localIds = new Set(store.garments.map((g) => g.id));

        // Pull anything this device has never seen.
        const incoming = remote.filter((g) => !localIds.has(g.id));
        for (const g of incoming) {
          if (g.imagePath && !(await hasImage(g.id))) {
            await restoreGarmentImage(g.id, g.imagePath);
          }
          useWardrobe.getState().addGarment(g);
        }

        // Push anything added before sign-in, or while offline.
        const remoteIds = new Set(remote.map((g) => g.id));
        for (const g of useWardrobe.getState().garments) {
          if (remoteIds.has(g.id) && g.imagePath) continue;

          let path = g.imagePath ?? null;
          if (!path) {
            const blob = await getImageBlob(g.id);
            if (blob) path = await uploadGarmentImage(user.id, g.id, blob);
          }

          await supabase.from("garments").upsert({
            id: g.id,
            user_id: user.id,
            category: g.category,
            name: g.name,
            colors: g.colors,
            style: g.style,
            warmth: g.warmth,
            formality: g.formality,
            description: g.description ?? null,
            image_path: path,
          });

          if (path && path !== g.imagePath) {
            useWardrobe.getState().updateGarment(g.id, { imagePath: path });
          }
        }
      } catch {
        // Sync is best-effort; the local wardrobe is always the source of truth.
      }
    })();
  }, [hydrated]);

  return null;
}
