import { CATEGORIES, STYLES, type Category, type Confidence, type Style } from "@/lib/types";

/**
 * Every helper here returns null on any failure. Screens always have a local
 * fallback (the manual tag form, or simply no styling note), so AI is strictly
 * additive and never blocks a flow. Same contract as Aura's lib/client/ai.ts.
 */

export interface GarmentAnalysis {
  category: Category;
  name: string;
  style: Style;
  warmth: number;
  formality: number;
  confidence: Confidence;
}

export interface StylingNote {
  note: string;
  vibe: string;
}

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Never trust the model's shape — coerce every field. (NutriLog pattern.) */
function coerce(raw: unknown): GarmentAnalysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    category: oneOf(o.category, CATEGORIES, "top"),
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 60) : "Untitled",
    style: oneOf(o.style, STYLES, "casual"),
    warmth: clampInt(o.warmth, 1, 5, 3),
    formality: clampInt(o.formality, 1, 5, 3),
    confidence: oneOf(o.confidence, ["high", "medium", "low"] as const, "low"),
  };
}

export async function analyzeGarment(input: {
  userId: string;
  image: string;
  mediaType: string;
  context?: string;
}): Promise<GarmentAnalysis | null> {
  try {
    const r = await fetch("/api/ai/analyze-garment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) return null;
    return coerce(await r.json());
  } catch {
    return null;
  }
}

export async function fetchStylingNote(input: {
  userId: string;
  date: string;
  outfit: Array<{ name: string; colors: string[]; style: string }>;
}): Promise<StylingNote | null> {
  try {
    const r = await fetch("/api/ai/styling-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Record<string, unknown>;
    const note = typeof data.note === "string" ? data.note.trim() : "";
    if (!note) return null;
    return {
      note: note.slice(0, 240),
      vibe: typeof data.vibe === "string" ? data.vibe.trim().slice(0, 40) : "",
    };
  } catch {
    return null;
  }
}
