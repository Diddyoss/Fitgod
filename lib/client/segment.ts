/**
 * Real garment isolation with an in-browser segmentation model.
 *
 * The colour flood-fill in lib/cutout.ts only handles a plain backdrop
 * connected to the frame edge. Anything textured — a bed, a carpet, a wall
 * with shadows — defeats it, because a flood fill has no concept of what a
 * shirt is. This does.
 *
 * Everything runs locally: weights are downloaded once, cached by the browser,
 * and the photo never leaves the device.
 *
 * Transformers.js is loaded from a CDN at runtime rather than installed as a
 * dependency. It bundles ONNX Runtime as pre-minified ESM that Next's SWC
 * cannot parse, so bundling it fails the build outright; `webpackIgnore` keeps
 * webpack away from it entirely. It also keeps the library out of the app
 * bundle for the many users who never hit the slow path.
 */

const LIB_URL =
  process.env.NEXT_PUBLIC_TRANSFORMERS_URL ||
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

/** Overridable so the weights can be self-hosted later without a code change. */
const MODEL_ID = process.env.NEXT_PUBLIC_SEGMENT_MODEL || "briaai/RMBG-1.4";

export type SegmentStatus =
  | { phase: "loading"; progress: number }
  | { phase: "running" }
  | { phase: "done" }
  | { phase: "unavailable" };

type Reporter = (s: SegmentStatus) => void;

// The CDN module is untyped by construction, so these stay loose on purpose.
// eslint-disable-next-line
type Lib = Record<string, any>;

let libPromise: Promise<Lib> | null = null;
// Holds { model, processor }, both callable — kept loose for the same reason.
// eslint-disable-next-line
let sessionPromise: Promise<any> | null = null;
let unavailable = false;

function loadLib(): Promise<Lib> {
  if (!libPromise) {
    libPromise = import(/* webpackIgnore: true */ LIB_URL);
  }
  return libPromise;
}

async function getSession(report?: Reporter) {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const { AutoModel, AutoProcessor, env } = await loadLib();

    // Weights come from the hub; the browser caches them after the first run.
    env.allowLocalModels = false;

    const onProgress = (p: { status?: string; progress?: number }) => {
      if (p?.status === "progress" && typeof p.progress === "number") {
        report?.({ phase: "loading", progress: Math.min(100, Math.round(p.progress)) });
      }
    };

    // WebGPU is roughly an order of magnitude faster; fall back to WASM.
    let model;
    try {
      model = await AutoModel.from_pretrained(MODEL_ID, {
        device: "webgpu",
        progress_callback: onProgress,
      });
    } catch {
      model = await AutoModel.from_pretrained(MODEL_ID, { progress_callback: onProgress });
    }
    const processor = await AutoProcessor.from_pretrained(MODEL_ID);
    return { model, processor };
  })().catch((err) => {
    console.error("segmentation model unavailable", err);
    unavailable = true;
    sessionPromise = null;
    return null;
  });

  return sessionPromise;
}

/** Warm the model up ahead of the first upload. Safe to call repeatedly. */
export function preloadSegmenter(): void {
  if (typeof window === "undefined" || unavailable) return;
  void getSession();
}

export function segmenterUnavailable(): boolean {
  return unavailable;
}

/**
 * Returns a per-pixel alpha mask (length width*height) for `canvas`, or null
 * when the model could not run — callers then keep whatever they already had.
 */
export async function segmentAlpha(
  canvas: HTMLCanvasElement,
  report?: Reporter,
): Promise<Uint8ClampedArray | null> {
  if (typeof window === "undefined" || unavailable) return null;

  try {
    const session = await getSession(report);
    if (!session) return null;

    const { RawImage } = await loadLib();
    report?.({ phase: "running" });

    const image = await RawImage.fromCanvas(canvas);
    const { pixel_values } = await session.processor(image);
    const output = await session.model({ input: pixel_values });

    // Background-removal exports disagree on what they call this.
    const tensor = output?.output ?? output?.alphas ?? output?.logits ?? Object.values(output)[0];
    if (!tensor) return null;

    const plane = tensor.dims?.length === 4 ? tensor[0] : tensor;
    const raw = await RawImage.fromTensor(plane.mul(255).to("uint8")).resize(
      canvas.width,
      canvas.height,
    );

    // RawImage may come back 1- or 3-channel; take the first channel either way.
    const channels = raw.channels ?? 1;
    const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = raw.data[i * channels];

    report?.({ phase: "done" });
    return alpha;
  } catch (err) {
    console.error("segmentation failed", err);
    report?.({ phase: "unavailable" });
    return null;
  }
}
