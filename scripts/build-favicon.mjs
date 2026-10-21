// Favicon: the letter ह in deep green on a cream rounded square, with the
// glyph converted to an outline so it renders without any font.
//
//   public/svg/favicon.svg     master
//   src/app/icon.svg           browsers (Next.js serves it as the site icon)
//   src/app/favicon.ico        16/32/48 px for older browsers
//   src/app/apple-icon.png     180 px for iOS home screens
//   public/icons/icon-192.png, icon-512.png   web app manifest
//
// Run: node scripts/build-favicon.mjs   (part of `npm run build:brand`)
import * as fontkit from "fontkit";
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
const GREEN = token("color-bottle");
const CREAM = token("color-cream");

const font = fontkit.openSync(join(root, "node_modules/@fontsource/tiro-devanagari-hindi/files/tiro-devanagari-hindi-devanagari-400-normal.woff2"));
const run = font.layout("ह");
const glyph = run.glyphs[0];
const bb = glyph.bbox;

// Fit the glyph's ink box into the middle 66% of a 64 × 64 square.
const SIZE = 64, BOX = SIZE * 0.66;
const s = Math.min(BOX / (bb.maxX - bb.minX), BOX / (bb.maxY - bb.minY));
const tx = (SIZE - (bb.maxX - bb.minX) * s) / 2 - bb.minX * s;
const ty = (SIZE + (bb.maxY - bb.minY) * s) / 2 + bb.minY * s;
const d = glyph.path
  .transform(s, 0, 0, -s, tx, ty)
  .toSVG()
  .replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(2)));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="14" fill="${CREAM}"/><path d="${d}" fill="${GREEN}"/></svg>\n`;
// Square (unrounded) background for platforms that apply their own mask.
const square = svg.replace(/ rx="14"/, "");

writeFileSync(join(root, "public/svg/favicon.svg"), svg);
writeFileSync(join(root, "src/app/icon.svg"), svg);

const png = (source, size) => sharp(Buffer.from(source), { density: (72 * size) / SIZE * 2 }).resize(size, size).png().toBuffer();
writeFileSync(join(root, "src/app/apple-icon.png"), await png(square, 180));
mkdirSync(join(root, "public/icons"), { recursive: true });
writeFileSync(join(root, "public/icons/icon-192.png"), await png(square, 192));
writeFileSync(join(root, "public/icons/icon-512.png"), await png(square, 512));

// favicon.ico holding PNG images (supported by every browser in use today).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((n) => png(svg, n)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(n, e);
  header.writeUInt8(n, e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync(join(root, "src/app/favicon.ico"), Buffer.concat([header, ...images]));
console.log(`favicon: ह in ${GREEN} on ${CREAM} → svg, ico, apple-icon, 192/512`);
