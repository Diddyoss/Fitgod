// Server-side only — resolve the caller's user id for caching/rate-limiting.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Prefer the authenticated Supabase (anonymous) user from the request cookies.
 * Falls back to the client-supplied id when Supabase isn't configured — that id
 * only keys caches and the daily counter, never grants data access.
 */
export async function resolveUserId(bodyUserId?: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const store = cookies();
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => store.getAll(),
          setAll: () => {}, // read-only in route handlers
        },
      });
      const { data } = await supabase.auth.getUser();
      if (data.user) return data.user.id;
    } catch {
      // fall through
    }
  }
  return bodyUserId && /^[\w-]{8,64}$/.test(bodyUserId) ? bodyUserId : "anonymous";
}
