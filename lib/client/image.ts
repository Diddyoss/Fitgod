/** 512px is ample for "what garment is this". NutriLog uses 1024 because
 * reading nutrition labels needs the detail; classification does not, and the
 * smaller edge roughly quarters the image-token cost of the vision call. */
const MAX_EDGE = 512;
const QUALITY = 0.85;
/** Palette sampling grid. Small on purpose — this is a color histogram, not a thumbnail. */
const SAMPLE_EDGE = 64;

export interface ProcessedImage {
  /** Raw base64, no data: prefix — what the API route expects. */
  base64: string;
  blob: Blob;
  mediaType: "image/jpeg";
  /** RGBA from a 64x64 downsample, fed to lib/palette.ts. */
  pixels: Uint8ClampedArray;
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

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode that image"))),
      "image/jpeg",
      QUALITY,
    );
  });
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  const blob = await toBlob(canvas);

  // Separate tiny draw for the histogram, so palette cost is independent of photo size.
  const sample = document.createElement("canvas");
  sample.width = SAMPLE_EDGE;
  sample.height = SAMPLE_EDGE;
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("Canvas unavailable");
  sctx.drawImage(img, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
  const pixels = sctx.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE).data;

  return {
    base64: dataUrl.split(",")[1] ?? "",
    blob,
    mediaType: "image/jpeg",
    pixels,
  };
}
