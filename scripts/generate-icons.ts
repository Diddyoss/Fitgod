/**
 * Renders the Fitgod app icons with no image dependencies — just a hand-rolled
 * PNG encoder over zlib. Run with `npm run generate-icons`; commit the output.
 * (Same approach as Aura's scripts/generate-icons.ts.)
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BG: [number, number, number] = [0x0a, 0x0a, 0x0b];
const ACCENT: [number, number, number] = [0xc8, 0xff, 0x00];

// ------------------------------------------------------------------ PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // 10..12 stay zero: deflate, adaptive filtering, no interlace

  // One filter byte (0 = None) per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- drawing

function canvas(size: number, bg: [number, number, number]): Buffer {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

function plot(buf: Buffer, size: number, x: number, y: number, c: [number, number, number], a = 1) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (Math.floor(y) * size + Math.floor(x)) * 4;
  buf[i] = Math.round(buf[i] * (1 - a) + c[0] * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + c[1] * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + c[2] * a);
}

/** Anti-aliased thick line via distance-to-segment. */
function line(
  buf: Buffer,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  c: [number, number, number],
) {
  const half = width / 2;
  const minX = Math.floor(Math.min(x0, x1) - half - 1);
  const maxX = Math.ceil(Math.max(x0, x1) + half + 1);
  const minY = Math.floor(Math.min(y0, y1) - half - 1);
  const maxY = Math.ceil(Math.max(y0, y1) + half + 1);

  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy || 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let t = ((px - x0) * dx + (py - y0) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
      const a = Math.max(0, Math.min(1, half + 0.5 - d));
      if (a > 0) plot(buf, size, x, y, c, a);
    }
  }
}

function ring(
  buf: Buffer,
  size: number,
  cx: number,
  cy: number,
  r: number,
  width: number,
  c: [number, number, number],
) {
  const half = width / 2;
  for (let y = Math.floor(cy - r - width); y <= Math.ceil(cy + r + width); y++) {
    for (let x = Math.floor(cx - r - width); x <= Math.ceil(cx + r + width); x++) {
      const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r);
      const a = Math.max(0, Math.min(1, half + 0.5 - d));
      if (a > 0) plot(buf, size, x, y, c, a);
    }
  }
}

/** A clothes hanger, drawn in units of the icon size. */
function drawHanger(buf: Buffer, size: number) {
  const u = size / 100;
  const w = Math.max(2, 7 * u);

  ring(buf, size, 50 * u, 30 * u, 8 * u, w * 0.85, ACCENT); // hook
  line(buf, size, 50 * u, 38 * u, 50 * u, 46 * u, w * 0.85, ACCENT); // stem
  line(buf, size, 50 * u, 46 * u, 20 * u, 68 * u, w, ACCENT); // left shoulder
  line(buf, size, 50 * u, 46 * u, 80 * u, 68 * u, w, ACCENT); // right shoulder
  line(buf, size, 20 * u, 68 * u, 80 * u, 68 * u, w, ACCENT); // bar
}

// ----------------------------------------------------------------- main

const OUT: Array<[string, number]> = [
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-192.png", 192],
  ["public/icons/apple-touch-icon.png", 180],
  ["public/icons/icon-64.png", 64],
  ["app/icon.png", 64],
];

for (const [rel, size] of OUT) {
  const buf = canvas(size, BG);
  drawHanger(buf, size);
  const path = join(process.cwd(), rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(size, buf));
  console.log(`wrote ${rel} (${size}px)`);
}
