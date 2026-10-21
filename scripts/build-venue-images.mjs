// Grades the client's interior photos to the light theme (airy, warm, calmer
// yellows) and writes src/assets/venue/*.webp for next/image to resize.
// Run: node scripts/build-venue-images.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src/assets/venue");
mkdirSync(outDir, { recursive: true });

// Empty-room photos only: no person anywhere in the frame, and nothing is
// blurred or cropped out. arch, main-hall, garden.png and entrance show people and
// are not used; replacements are listed in docs/photos-needed.txt.
// source file in assets/source/photos → output name in src/assets/venue
const PHOTOS = {
  "box-office.png": "box-office",
  "box-office-front.webp": "box-office-front",
  "pavilion.png": "pavilion",
  "lobby-pranam.png": "lobby",
  "rattan-hall.jpg": "rattan-hall",
  // Client-edited version of garden.png with the staff member removed.
  "garden-edited.webp": "garden",
};
// Editorial crops (source pixels). Rattan hall: a 4:5 portrait around the
// rattan table, the cushioned chair in front and the brass screens behind.
const CROPS = {
  "rattan-hall": { left: 340, top: 130, width: 664, height: 830 },
  // Garden: the neon sign, the palms and the set tables; most of the large
  // foreground chair is left out.
  garden: { left: 300, top: 70, width: 1000, height: 800 },
};
const MAX = 1800;

for (const [file, name] of Object.entries(PHOTOS)) {
  const img = sharp(join(root, "assets/source/photos", file)).rotate();
  if (CROPS[name]) img.extract(CROPS[name]);
  await img
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
    .normalise({ lower: 0.5, upper: 99.5 })
    // Lift shadows into a soft matte, add a little exposure.
    .linear(0.9, 22)
    .modulate({ brightness: 1.04, saturation: 0.84 })
    // Warm, but pull the strongest yellows back towards cream.
    .recomb([
      [1.0, 0.03, 0.0],
      [0.0, 0.98, 0.02],
      [0.02, 0.04, 0.94],
    ])
    .sharpen({ sigma: 0.5 })
    .webp({ quality: 82, effort: 6 })
    .toFile(join(outDir, `${name}.webp`));
  console.log("graded", name);
}
