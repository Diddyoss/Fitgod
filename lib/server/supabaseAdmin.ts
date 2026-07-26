// Server-side only — service-role client. Bypasses RLS, so never expose it.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null | undefined;

export function getAdmin(): SupabaseClient | null {
  if (admin !== undefined) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return admin;
}
