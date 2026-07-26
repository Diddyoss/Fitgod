import { NextResponse } from "next/server";
import { z } from "zod";
import { aiJson, FITGOD_VOICE } from "@/lib/server/openrouter";
import { getCache, rateLimit, setCache } from "@/lib/server/aiCache";
import { resolveUserId } from "@/lib/server/auth";

const Input = z.object({
  userId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  outfit: z
    .array(
      z.object({
        name: z.string(),
        colors: z.array(z.string()),
        style: z.string(),
      }),
    )
    .min(2)
    .max(3),
});

const Output = z.object({
  note: z.string().min(1).max(240),
  vibe: z.string().min(1).max(40),
});

const SYSTEM = `${FITGOD_VOICE}

You are given the three garments that have already been chosen for today. Write one or two short sentences on how to wear them together — a tuck, a roll, a layer, what to leave off. Return ONLY a raw JSON object:

{ "note": "one or two sentences", "vibe": "two or three word label" }

Rules:
- Do not restate the garment list back to the user.
- Do not suggest items that are not in the outfit.
- Do not comment on the weather or the occasion; you know neither.
- No emoji, no exclamation marks.`;

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { date, outfit, userId: bodyUserId } = parsed.data;

  const userId = await resolveUserId(bodyUserId);

  // Cache before the rate limit: revisiting today's note must never cost a call.
  const key = `note:${userId}:${date}:${outfit.map((o) => o.name).join("|")}`;
  const cached = await getCache<z.infer<typeof Output>>(key);
  if (cached) return NextResponse.json(cached);

  if (!(await rateLimit(userId, date))) {
    return NextResponse.json({ error: "daily limit reached" }, { status: 429 });
  }

  const user = `Today's outfit:\n${outfit
    .map((o) => `- ${o.name} (${o.style}, colours ${o.colors.join(", ") || "unknown"})`)
    .join("\n")}`;

  const result = await aiJson(SYSTEM, user, Output);
  if (!result) {
    return NextResponse.json({ error: "ai unavailable" }, { status: 503 });
  }

  await setCache(key, "note", result);
  return NextResponse.json(result);
}
