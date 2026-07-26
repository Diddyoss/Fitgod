import { NextResponse } from "next/server";
import { z } from "zod";
import { aiVisionJson, FITGOD_VOICE } from "@/lib/server/openrouter";
import { getCache, hashKey, rateLimit, setCache } from "@/lib/server/aiCache";
import { resolveUserId } from "@/lib/server/auth";
import { todayISO } from "@/lib/dates";
import { CATEGORIES, STYLES } from "@/lib/types";

const Input = z.object({
  userId: z.string().optional(),
  image: z.string().min(1),
  mediaType: z.string().default("image/jpeg"),
  context: z.string().max(300).optional(),
});

const Output = z.object({
  category: z.enum(CATEGORIES as unknown as [string, ...string[]]),
  name: z.string().min(1).max(60),
  style: z.enum(STYLES as unknown as [string, ...string[]]),
  warmth: z.number().int().min(1).max(5),
  formality: z.number().int().min(1).max(5),
  confidence: z.enum(["high", "medium", "low"]),
});

/**
 * Note there is no `colors` field: dominant colors are measured from the pixels
 * in lib/palette.ts. Models guess hex values badly, and lib/rotation.ts leans on
 * them for 40% of its score.
 */
const SYSTEM = `${FITGOD_VOICE}

You identify a single item of clothing from a photo. Return ONLY a raw JSON object — no markdown, no code fences — in exactly this shape:

{
  "category": "top" | "bottom" | "shoes",
  "name": "short lowercase description, e.g. black relaxed hoodie",
  "style": "casual" | "streetwear" | "smart-casual" | "formal" | "sporty" | "statement",
  "warmth": 1,
  "formality": 1,
  "confidence": "high" | "medium" | "low"
}

Rules:
- "category": outerwear, shirts, knitwear and t-shirts are "top". Trousers, jeans, shorts and skirts are "bottom". Anything worn on the feet is "shoes".
- "warmth": 1 is summer-weight, 5 is heavy winter.
- "formality": 1 is loungewear, 3 is smart-casual, 5 is black tie.
- "name": at most six words. Do not name a colour you are unsure of.
- Never return null and never omit a field. If unsure, pick the closest option and set "confidence" to "low".`;

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { image, mediaType, context, userId: bodyUserId } = parsed.data;

  // Re-uploading the same photo is free.
  const key = `garment:${hashKey({ image, context: context ?? "" })}`;
  const cached = await getCache<z.infer<typeof Output>>(key);
  if (cached) return NextResponse.json(cached);

  const userId = await resolveUserId(bodyUserId);
  if (!(await rateLimit(userId, todayISO()))) {
    return NextResponse.json({ error: "daily limit reached" }, { status: 429 });
  }

  const userText = context?.trim()
    ? `Identify this garment.\nAdditional context from the user: "${context.trim()}"`
    : "Identify this garment.";

  const result = await aiVisionJson(
    SYSTEM,
    userText,
    `data:${mediaType};base64,${image}`,
    Output,
  );
  if (!result) {
    return NextResponse.json({ error: "ai unavailable" }, { status: 503 });
  }

  await setCache(key, "garment", result);
  return NextResponse.json(result);
}
