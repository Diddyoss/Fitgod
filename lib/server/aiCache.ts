// Server-side only — AI response cache + daily rate limit.
// Uses Supabase when configured; falls back to per-instance memory in dev.
import { getAdmin } from "./supabaseAdmin";

const memCache = new Map<string, unknown>();
const memUsage = new Map<string, number>();

export async function getCache<T>(key: string): Promise<T | null> {
  const admin = getAdmin();
  if (!admin) return (memCache.get(key) as T) ?? null;
  const { data } = await admin.from("ai_cache").select("payload").eq("key", key).maybeSingle();
  return (data?.payload as T) ?? null;
}

export async function setCache(key: string, kind: string, payload: unknown): Promise<void> {
  const admin = getAdmin();
  if (!admin) {
    memCache.set(key, payload);
    return;
  }
  await admin.from("ai_cache").upsert({ key, kind, payload });
}

export const DAILY_LIMIT = 20;

/** Returns true when the user may make another AI request today (20/day). */
export async function rateLimit(userId: string, date: string): Promise<boolean> {
  const admin = getAdmin();
  if (!admin) {
    const k = `${userId}:${date}`;
    const n = (memUsage.get(k) ?? 0) + 1;
    memUsage.set(k, n);
    return n <= DAILY_LIMIT;
  }
  const { data } = await admin
    .from("api_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  const count = data?.count ?? 0;
  if (count >= DAILY_LIMIT) return false;
  await admin.from("api_usage").upsert({ user_id: userId, date, count: count + 1 });
  return true;
}

/** Deterministic stringify: object keys sorted recursively. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Stable 32-bit hash for cache keys derived from request payloads. */
export function hashKey(input: unknown): string {
  const str = stableStringify(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
