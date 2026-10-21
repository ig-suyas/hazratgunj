// Turns the picked source photos into one consistent "shoot":
//   4:5 crop → level/colour grade → warm tone → soft vignette → WebP 480w + ≤1200w,
// plus a tiny blurred placeholder. Writes public/dishes/<id>-320.webp, -480.webp and
// <id>-full.webp and adds each dish to src/assets/dish-photos.json.
// Sources: assets/source/food (picks.json says which photo goes with which
// dish; credits in CREDITS.md). Photos the client supplies through
// `npm run build:photos` (source "client") are never replaced.
//
// Run: npm run build:dish-images
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const picks = JSON.parse(readFileSync(join(root, "assets/source/food/picks.json"), "utf8")).items;
const outDir = join(root, "public/dishes");
mkdirSync(outDir, { recursive: true });
const MANIFEST = join(root, "src/assets/dish-photos.json");

const FULL = 1200, THUMB = 480, RATIO = 5 / 4;

function sourceFile(p) {
  return p.tier === "A"
    ? join(root, "assets/source/food/google", `${p.src}.jpg`)
    : join(root, "assets/source/food/unsplash", `${p.src}.jpg`);
}

/** Crop window (in source pixels) for a 4:5 frame around a focus point (0–1). */
function cropBox(w, h, focus = [0.5, 0.5], zoom = 1) {
  let cw = Math.min(w, Math.floor(h / RATIO));
  cw = Math.floor(cw / zoom);
  const ch = Math.min(h, Math.round(cw * RATIO));
  const left = Math.min(w - cw, Math.max(0, Math.round(focus[0] * w - cw / 2)));
  const top = Math.min(h - ch, Math.max(0, Math.round(focus[1] * h - ch / 2)));
  return { left, top, width: cw, height: ch };
}

// Light edge falloff only — the set should read bright, not moody.
function vignette(w, h) {
  return Buffer.from(
    `<svg width="${w}" height="${h}"><defs><radialGradient id="v" cx="50%" cy="48%" r="78%">` +
      `<stop offset="70%" stop-color="#2a1a0c" stop-opacity="0"/>` +
      `<stop offset="100%" stop-color="#2a1a0c" stop-opacity="0.16"/></radialGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#v)"/></svg>`,
  );
}

/** Mean luma (0–255) of an image buffer. */
async function luma(buf) {
  const { channels } = await sharp(buf).greyscale().stats();
  return channels[0].mean;
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
for (const [id, p] of Object.entries(picks)) {
  if (p.tier === "T" || manifest[id]?.source === "client") continue;
  const file = sourceFile(p);
  if (!existsSync(file)) throw new Error(`${id}: missing source ${file}`);

  const img = sharp(file).rotate();
  const { width, height } = await img.metadata();
  const box = cropBox(width, height, p.focus, p.zoom);
  const fullW = Math.min(FULL, box.width);
  const fullH = Math.round(fullW * RATIO);

  // Grade: bright and appetising. Stretch levels per image, then lift
  // exposure until the frame reaches a common brightness (dim phone shots
  // get the most help), add saturation and a touch of warmth, light vignette.
  const base = await sharp(file)
    .rotate()
    .extract(box)
    .resize(fullW, fullH, { kernel: "lanczos3" })
    .normalise({ lower: 0.5, upper: 99.6 })
    .toBuffer();
  const TARGET = 132; // mean luma the set is pulled towards
  const lift = Math.min(1.45, Math.max(1, TARGET / (await luma(base))));
  const graded = await sharp(base)
    .modulate({ brightness: (p.brightness ?? 1) * lift, saturation: p.saturation ?? 1.22 })
    .linear(1.06, -6) // gentle contrast so lifted shots don't go flat
    .recomb([
      [1.03, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 0.97],
    ])
    .composite([{ input: vignette(fullW, fullH), blend: "multiply" }])
    .sharpen({ sigma: 0.6 })
    .toColourspace("srgb")
    .png()
    .toBuffer();

  await sharp(graded).webp({ quality: 76, effort: 6 }).toFile(join(outDir, `${id}-full.webp`));
  await sharp(graded).resize(THUMB, Math.round(THUMB * RATIO)).sharpen({ sigma: 0.5 }).webp({ quality: 72, effort: 6 }).toFile(join(outDir, `${id}-480.webp`));
  // Phones show the thumbnail about 100px wide: 320px covers up to 3x screens.
  await sharp(graded).resize(320, 400).sharpen({ sigma: 0.5 }).webp({ quality: 70, effort: 6 }).toFile(join(outDir, `${id}-320.webp`));
  const blur = await sharp(graded).resize(12, 15).blur(0.6).webp({ quality: 40 }).toBuffer();

  manifest[id] = {
    src: `/dishes/${id}`,
    width: fullW,
    height: fullH,
    blur: `data:image/webp;base64,${blur.toString("base64")}`,
    source: p.tier === "A" ? "google" : "unsplash",
  };
  process.stdout.write(".");
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest).length} dishes → public/dishes`);
