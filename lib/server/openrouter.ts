// Server-side only — OpenRouter chat-completions helper (OpenAI-compatible).
import { z } from "zod";

/**
 * Model ids verified against OpenRouter's live list on 2026-07-26.
 *
 * `google/gemini-3-flash-preview` — the default in NutriLog and Aura — no
 * longer exists and must not be used here.
 */
const PRIMARY_MODEL = () => process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash-lite";
const TEXT_FALLBACK = "deepseek/deepseek-chat";
/** Deliberately a different family, so one provider outage doesn't take out both legs. */
const VISION_FALLBACK = () => process.env.OPENROUTER_VISION_FALLBACK || "qwen/qwen3.7-plus";

type Content = string | Array<Record<string, unknown>>;

/** Strip ```json fences the model may wrap around its output. */
export function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function callModel(model: string, system: string, user: Content): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Fitgod",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error("OpenRouter error", model, res.status, (await res.text()).slice(0, 400));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function tryModels<S extends z.ZodTypeAny>(
  models: string[],
  system: string,
  user: Content,
  schema: S,
): Promise<z.infer<S> | null> {
  for (const model of models) {
    const raw = await callModel(model, system, user);
    if (!raw) continue;
    try {
      const parsed = schema.safeParse(JSON.parse(stripFences(raw)));
      if (parsed.success) return parsed.data;
    } catch {
      // fall through to the next model
    }
  }
  return null;
}

/**
 * Ask for JSON matching `schema`. Returns null when every model fails, so
 * callers serve their local fallback instead.
 */
export async function aiJson<S extends z.ZodTypeAny>(
  system: string,
  user: string,
  schema: S,
): Promise<z.infer<S> | null> {
  return tryModels([PRIMARY_MODEL(), TEXT_FALLBACK], system, user, schema);
}

/** Same, with an image attached as an OpenAI-style data-URL content block. */
export async function aiVisionJson<S extends z.ZodTypeAny>(
  system: string,
  userText: string,
  imageDataUrl: string,
  schema: S,
): Promise<z.infer<S> | null> {
  const content = [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ];
  return tryModels([PRIMARY_MODEL(), VISION_FALLBACK()], system, content, schema);
}

export const FITGOD_VOICE =
  "You write for Fitgod, a personal wardrobe app. Voice: laconic stylist — plain, concrete, " +
  "never gushing; no emoji; no exclamation marks. Colors and outfit choices are computed " +
  "before you see them: never invent, rename or second-guess them. " +
  "Respond with JSON only, exactly matching the requested shape.";
