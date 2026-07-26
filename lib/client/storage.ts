"use client";

import { getSupabase } from "@/lib/supabaseBrowser";
import { putImage } from "./imageStore";

const BUCKET = "wardrobe";
const SIGNED_TTL = 60 * 60; // 1 hour

/** Path convention the storage.objects RLS policies key on. */
export function garmentPath(userId: string, garmentId: string): string {
  return `${userId}/${garmentId}.jpg`;
}

/** All of these no-op cleanly when Supabase isn't configured. */
export async function uploadGarmentImage(
  userId: string,
  garmentId: string,
  blob: Blob,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = garmentPath(userId, garmentId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) {
    console.error("storage upload failed", error.message);
    return null;
  }
  return path;
}

export async function deleteGarmentImage(path: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("storage delete failed", error.message);
}

/**
 * Fetch a remote garment image once and cache it in IndexedDB. Only runs on a
 * fresh device — normal use renders straight from IndexedDB, so signed URLs are
 * never on the hot path.
 */
export async function restoreGarmentImage(garmentId: string, path: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return false;

  try {
    const res = await fetch(data.signedUrl);
    if (!res.ok) return false;
    await putImage(garmentId, await res.blob());
    return true;
  } catch {
    return false;
  }
}
