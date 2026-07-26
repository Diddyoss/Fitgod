# Fitgod

Photograph the clothes you own. Every day Fitgod picks one outfit from them, stacked top-to-shoes with the photo backgrounds cut away. Swipe any piece to swap just that piece.

Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Zustand · Supabase · OpenRouter

---

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. **It works with no configuration at all** — the wardrobe lives in IndexedDB and localStorage, and garment tagging falls back to a manual form. Supabase and OpenRouter are both optional upgrades.

```bash
npm test          # 70 unit tests over the rotation, colour and palette logic
npm run build     # production build
npm run generate-icons   # regenerate PWA icons (output is committed)
```

## How the daily outfit works

`lib/rotation.ts` ranks every top × bottom × shoes combination and returns the top eight. Rank 1 is today; ranks 2–8 fill the swipe deck.

```
score = 0.40·colourHarmony + 0.25·formalityMatch + 0.15·warmthCoherence + jitter − recencyPenalty
```

The jitter is seeded on `(userId, date)` **and** the combination's own id, so the ranking is independent of enumeration order. That means the same day always produces the same outfit no matter how many times you reload — nothing about the daily pick is stored — while tomorrow reshuffles. Recency subtracts 0.5 for any garment worn in the last three days and a further 1.0 for the exact combination within seven.

Above 400 combinations the space is sampled deterministically rather than enumerated.

## Background removal

`lib/cutout.ts` estimates the background from the border pixels, flood-fills inward from the edges, and removes only what is both close to that colour **and** connected to an edge. That last condition is what keeps a white logo in the middle of a black shirt while taking the surround away. The edge is then feathered and the image trimmed to the garment's bounding box, so outfits stack cleanly with no dead space.

It bails out and keeps the original if it would remove more than 92% of the frame (the estimate was wrong) or less than 1% (nothing to gain), so a busy background degrades to the plain photo rather than a destroyed one.

There is deliberately no ML model here: a WASM segmentation model would be tens of megabytes and could not run under the app's CSP. The tradeoff is that this wants a plain, contrasting backdrop — which is what the upload screen asks for.

The cutout is stored as PNG and is what you see. The vision model is still sent the **original** JPEG with its background: a transparent PNG risks being composited onto black, which would erase a black garment entirely.

## Colour comes from pixels, not from the model

`lib/palette.ts` measures the two or three dominant colours from a 64×64 downsample of the **cutout**, so the background can no longer skew them. Vision models are unreliable at naming hex values — they answer `#000000` for charcoal and `#FFFFFF` for cream — and colour harmony is 40% of the score, so model-guessed hexes would quietly skew every ranking. The AI is asked only for category, name, style, warmth and formality.

## Optional: Supabase

Copy `.env.example` to `.env.local` and fill in the Supabase values, then:

1. Run `supabase/migrations/001_init.sql` in the SQL editor.
2. Enable the **Anonymous** provider under Authentication → Providers.

Sign-in happens once, at the end of onboarding. Photos upload to a private `wardrobe` bucket at `{user_id}/{garment_id}.jpg`, with `storage.objects` policies keyed on the path prefix. IndexedDB stays the render source, so signed URLs are only fetched when restoring on a fresh device.

## Optional: OpenRouter

Set `OPENROUTER_API_KEY` for auto-tagging and the daily styling note. Requests are cached by image hash (re-uploads are free) and capped at 20 per user per day.

Model ids verified against OpenRouter on 2026-07-26:

| Role | Model |
|---|---|
| Vision primary | `google/gemini-3.1-flash-lite` |
| Vision fallback | `qwen/qwen3.7-plus` |
| Text | `google/gemini-3.1-flash-lite` → `deepseek/deepseek-chat` |

> `google/gemini-3-flash-preview` no longer exists on OpenRouter. Do not use it.

At 512px, tagging costs roughly $0.0005–0.001 per garment, so a 200-item wardrobe is well under $0.25 to tag once. The vision fallback is deliberately a different model family; DeepSeek is text-only and cannot serve as one.

## Layout

```
app/            routes; api/ai/* route handlers
components/     UI — OutfitCollage (stacked, per-piece swipe), OutfitDeck, WaterfallGrid
lib/            pure domain logic (unit-tested): rotation, colour, palette, cutout, seed, dates
lib/client/     browser-only: image processing, IndexedDB, storage, AI fetchers
lib/server/     server-only: OpenRouter, cache + rate limit, auth, service-role client
store/          zustand, persisted to localStorage (metadata only — photos go to IndexedDB)
supabase/       migrations
```

## Not in v1

AI-rendered models, weather-aware rotation (the warmth term is already isolated for it), multi-photo garments, an outfit calendar, and background removal for busy (non-plain) backdrops.
