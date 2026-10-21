// Share image (Open Graph / WhatsApp / X): src/app/opengraph-image.jpg, 1200 × 630.
// Cream ground, the themed logo, name and address set in Cormorant (as
// outlines, so no font is needed to render it), and the Box Office in the arch.
// Run: node scripts/build-og.mjs   (after build:brand)
import * as fontkit from "fontkit";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { archPath } from "../src/design/arch.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
const C = {
  cream: token("color-cream"),
  sand: token("color-sand"),
  brass: token("color-brass"),
  brassInk: token("color-brass-ink"),
  charcoal: token("color-charcoal"),
  muted: token("color-muted"),
};
const font = (w) => fontkit.openSync(join(root, `node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-${w}-normal.woff2`));
const F600 = font(600), F500 = font(500);

function text(f, str, size, x, y, fill, tracking = 0) {
  const s = size / f.unitsPerEm;
  const run = f.layout(str);
  let pen = x, d = "";
  run.glyphs.forEach((g, i) => {
    d += g.path.transform(s, 0, 0, -s, pen, y).toSVG();
    pen += run.positions[i].xAdvance * s + tracking;
  });
  return `<path fill="${fill}" d="${d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1))}"/>`;
}

const W = 1200, H = 630;
// Arch window on the right: 380 × 500, with the hall photo inside.
const AW = 380, AH = 500, AX = 740, AY = 70;
const arch = archPath({ width: AW, height: AH });
const room = await sharp(join(root, "src/assets/venue/box-office.webp")).resize(AW, AH, { fit: "cover", position: "top" }).toBuffer();
const mask = Buffer.from(`<svg width="${AW}" height="${AH}"><path d="${arch}" fill="#fff"/></svg>`);
const window = await sharp(room).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
const logo = await sharp(join(root, "public/logo/logo-384.webp")).resize(170, 170).toBuffer();

const tile = 7;
let checker = "";
for (let x = 0, i = 0; x < W; x += tile, i++) checker += `<rect x="${x}" y="${H - tile * 2 + ((i % 2) * tile)}" width="${tile}" height="${tile}" fill="${C.sand}"/>`;

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <path d="${arch}" transform="translate(${AX - 12} ${AY - 12}) scale(${(AW + 24) / AW} ${(AH + 12) / AH})" fill="none" stroke="${C.brass}" stroke-width="1.5"/>
  ${text(F600, "Hazratgunj", 84, 80, 352, C.charcoal)}
  ${text(F500, "Restaurant and Banquet", 40, 82, 408, C.brassInk, 0.5)}
  <rect x="82" y="440" width="90" height="1.5" fill="${C.brass}"/>
  ${text(F500, "Park Road, Gorakhpur", 34, 82, 500, C.muted)}
  ${text(F500, "North Indian, Chinese and Continental", 34, 82, 546, C.muted)}
  ${checker}
</svg>`;

const png = await sharp({ create: { width: W, height: H, channels: 3, background: C.cream } })
  .composite([
    { input: window, left: AX, top: AY },
    { input: logo, left: 76, top: 72 },
    { input: Buffer.from(overlay), left: 0, top: 0 },
  ])
  .jpeg({ quality: 84, mozjpeg: true })
  .toBuffer();
writeFileSync(join(root, "src/app/opengraph-image.jpg"), png);
writeFileSync(
  join(root, "src/app/opengraph-image.alt.txt"),
  "Hazratgunj Restaurant and Banquet, Park Road, Gorakhpur: the logo beside the Box Office dining room framed in an arch.",
);
console.log(`opengraph-image.jpg ${(png.length / 1024).toFixed(0)} KB`);
