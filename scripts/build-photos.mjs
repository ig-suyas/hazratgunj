// Swaps in the client's photos from public/images/ (names in docs/photos-needed.txt).
//
//   <dish-id>.jpg|jpeg|png|webp   → public/dishes/<dish-id>-320.webp, -480.webp (menu thumbnail)
//                                   public/dishes/<dish-id>-full.webp (dish sheet, ≤1200 wide)
//                                   + entry in src/assets/dish-photos.json
//   hall-wide, arch-doorway, garden-wide, balcony-wide, box-office, pavilion, lobby
//                                 → src/assets/venue/<same name>.webp (landing page photos;
//                                   empty rooms only, no people)
//
// Every dish photo gets the same treatment: 4:5 crop around the most
// interesting area, levels stretched, a bright and lively grade, WebP.
// Originals in public/images/ are not deployed (see .vercelignore).
//
// Run: npm run build:photos                        (reads public/images/)
//      npm run build:photos -- "D:\path\to\folder"  (reads any folder)
// File names are matched forgivingly: case, spaces and punctuation don't
// matter, and a dish's printed name works too when it is unique
// ("Paneer Tikka.jpg" → paneer-tikka).
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, extname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN = process.argv[2] ? resolve(process.argv[2]) : join(root, "public/images");
const DISHES = join(root, "public/dishes");
const VENUE = join(root, "src/assets/venue");
const MANIFEST = join(root, "src/assets/dish-photos.json");
const EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const INTERIOR = new Set(["hall-wide", "arch-doorway", "garden-wide", "balcony-wide", "box-office", "pavilion", "lobby"]);

const menu = JSON.parse(readFileSync(join(root, "src/data/menu.json"), "utf8"));
const ids = new Set(menu.items.map((i) => i.id));
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
// Printed dish name → id, only for names that belong to a single dish.
const byName = new Map();
for (const item of menu.items) {
  const key = slug(item.name);
  byName.set(key, byName.has(key) ? null : item.id);
}

const files = existsSync(IN) ? readdirSync(IN).filter((f) => EXT.has(extname(f).toLowerCase())) : [];
mkdirSync(DISHES, { recursive: true });

// Keep the photos already in the manifest (earlier picks from
// build-dish-images.mjs); a client photo replaces the one for its dish.
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const unknown = [];
let interiors = 0;

for (const file of files) {
  const raw = slug(basename(file, extname(file)));
  const name = ids.has(raw) || INTERIOR.has(raw) ? raw : (byName.get(raw) ?? raw);
  const src = join(IN, file);

  if (INTERIOR.has(name)) {
    await sharp(src)
      .rotate()
      .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
      // Same grade as scripts/build-venue-images.mjs, so all room photos match.
      .normalise({ lower: 0.5, upper: 99.5 })
      .linear(0.9, 22)
      .modulate({ brightness: 1.04, saturation: 0.84 })
      .recomb([
        [1.0, 0.03, 0.0],
        [0.0, 0.98, 0.02],
        [0.02, 0.04, 0.94],
      ])
      .sharpen({ sigma: 0.5 })
      .webp({ quality: 82, effort: 6 })
      .toFile(join(VENUE, `${name}.webp`));
    interiors++;
    continue;
  }
  if (!ids.has(name)) {
    unknown.push(file);
    continue;
  }

  // 4:5 crop around the busiest area of the frame, then a bright, appetising grade.
  const graded = await sharp(src)
    .rotate()
    .resize(1200, 1500, { fit: "cover", position: sharp.strategy.attention, withoutEnlargement: false })
    .normalise({ lower: 0.5, upper: 99.6 })
    .modulate({ brightness: 1.06, saturation: 1.18 })
    .linear(1.05, -4)
    .sharpen({ sigma: 0.6 })
    .toBuffer();
  const meta = await sharp(graded).metadata();

  await sharp(graded).webp({ quality: 78, effort: 6 }).toFile(join(DISHES, `${name}-full.webp`));
  await sharp(graded).resize(480, 600).webp({ quality: 74, effort: 6 }).toFile(join(DISHES, `${name}-480.webp`));
  await sharp(graded).resize(320, 400).webp({ quality: 70, effort: 6 }).toFile(join(DISHES, `${name}-320.webp`));
  const blur = await sharp(graded).resize(8, 10).blur(0.5).webp({ quality: 40 }).toBuffer();
  manifest[name] = {
    src: `/dishes/${name}`,
    width: meta.width,
    height: meta.height,
    blur: `data:image/webp;base64,${blur.toString("base64")}`,
    source: "client",
  };
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
const missing = menu.items.filter((i) => i.orderable !== false && !manifest[i.id]).length;
console.log(`dish photos: ${Object.keys(manifest).length} · interior photos: ${interiors} · dishes still without a photo: ${missing}`);
if (unknown.length) console.log(`not matched to a dish (check the name against docs/photos-needed.txt):\n  ${unknown.join("\n  ")}`);
if (interiors) console.log("interior photos replaced: run `npm run build` to rebuild the pages with them.");
