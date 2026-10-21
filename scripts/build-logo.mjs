// Recolours the client's logo to the site theme without touching its artwork.
//
//   in:  public/svg/logo.svg            (client's final logo, never modified)
//   out: public/svg/logo-theme.svg      same paths, theme colours
//        public/logo/logo-<w>.webp      raster sizes for <img srcset>
//
// The logo is a traced roundel in black, red and white, plus anti-aliasing
// shades in between. Each colour is re-mixed from three CSS variables in
// src/app/globals.css (--logo-dark, --logo-accent, --logo-light):
//   black → dark,  red → accent,  white → light,  in-between shades → the same blend.
// Set the variables back to #000000 / #ff0000 / #ffffff to get the original colours.
//
// Run: node scripts/build-logo.mjs   (part of `npm run build:brand`)
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`--${name} not found in globals.css`);
  return m[1];
};

const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", gray: "#808080", grey: "#808080", maroon: "#800000" };
const rgb = (c) => {
  let h = NAMED[c.toLowerCase()] ?? c;
  if (h.length === 4) h = "#" + [...h.slice(1)].map((x) => x + x).join("");
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const hex = (a) => "#" + a.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const DARK = rgb(token("logo-dark"));
const ACCENT = rgb(token("logo-accent"));
const LIGHT = rgb(token("logo-light"));

/** Express a colour as black/red/white weights, then rebuild it from the theme colours. */
function theme(colour) {
  const [r, g, b] = rgb(colour);
  const light = Math.min(g, b) / 255;
  const accent = Math.max(0, Math.min(1 - light, r / 255 - light));
  const dark = 1 - light - accent;
  return hex([0, 1, 2].map((i) => dark * DARK[i] + accent * ACCENT[i] + light * LIGHT[i]));
}

const src = readFileSync(join(root, "public/svg/logo.svg"), "utf8");
// Original colours set: use the file exactly as given, anti-aliasing included.
const ORIGINAL = hex(DARK) === "#000000" && hex(ACCENT) === "#ff0000" && hex(LIGHT) === "#ffffff";
const seen = new Map();
let out = ORIGINAL
  ? src
  : src.replace(/fill="([^"]+)"/g, (_, c) => {
      const t = theme(c);
      seen.set(c, t);
      return `fill="${t}"`;
    });
// Paths with no fill draw in black by default: give the root the theme's dark.
if (!ORIGINAL) out = out.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs} fill="${hex(DARK)}">`);
writeFileSync(join(root, "public/svg/logo-theme.svg"), out);

const dir = join(root, "public/logo");
mkdirSync(dir, { recursive: true });
for (const w of [96, 144, 192, 288, 384, 576]) {
  await sharp(Buffer.from(out), { density: (72 * w) / 1568 * 4 })
    .resize(w, w)
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(join(dir, `logo-${w}.webp`));
}
console.log(ORIGINAL ? "logo in its original colours + 6 sizes" : `logo-theme.svg + ${6} sizes · ${seen.size} colours re-mixed from dark ${hex(DARK)}, accent ${hex(ACCENT)}, light ${hex(LIGHT)}`);
