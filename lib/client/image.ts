import { removeBackground } from "@/lib/cutout";

/** 512px is ample for "what garment is this". NutriLog uses 1024 because
 * reading nutrition labels needs the detail; classification does not, and the
 * smaller edge roughly quarters the image-token cost of the vision call. */
const MAX_EDGE = 512;
const QUALITY = 0.85;
/** Palette sampling grid. Small on purpose — this is a colour histogram, not a thumbnail. */
const SAMPLE_EDGE = 64;

export interface ProcessedImage {
  /** Raw base64 of the ORIGINAL photo, background intact — what the vision
   *  model sees. A transparent cutout risks being composited onto black,
   *  which would erase a black garment entirely. */
  base64: string;
  mediaType: "image/jpeg";
  /** PNG cutout, trimmed to the garment. This is what gets stored and shown. */
  blob: Blob;
  /** RGBA from a 64x64 downsample of the cutout, fed to lib/palette.ts.
   *  Sampling the cutout means the background can no longer skew the colours. */
  pixels: Uint8ClampedArray;
  /** False when background removal was rejected and the full frame was kept. */
  cutout: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode that image"))),
      type,
      quality,
    );
  });
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  return [canvas, ctx];
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const [full, fullCtx] = makeCanvas(w, h);
  fullCtx.drawImage(img, 0, 0, w, h);

  // Keep the untouched frame for the model before we cut anything away.
  const base64 = (full.toDataURL("image/jpeg", QUALITY).split(",")[1] ?? "");

  const source = fullCtx.getImageData(0, 0, w, h);
  const result = removeBackground(source.data, w, h);

  let display = full;
  if (result.applied) {
    const { x, y, w: bw, h: bh } = result.bbox;
    const cropped = new Uint8ClampedArray(bw * bh * 4);
    for (let row = 0; row < bh; row++) {
      const start = ((y + row) * w + x) * 4;
      cropped.set(result.data.subarray(start, start + bw * 4), row * bw * 4);
    }
    const [trimmed, trimmedCtx] = makeCanvas(bw, bh);
    trimmedCtx.putImageData(new ImageData(cropped, bw, bh), 0, 0);
    display = trimmed;
  }

  // PNG, because the cutout needs its alpha channel.
  const blob = await toBlob(display, "image/png");

  // Separate tiny draw for the histogram, so palette cost is independent of photo size.
  const [sample, sampleCtx] = makeCanvas(SAMPLE_EDGE, SAMPLE_EDGE);
  sampleCtx.drawImage(display, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
  const pixels = sampleCtx.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE).data;

  return { base64, mediaType: "image/jpeg", blob, pixels, cutout: result.applied };
}
