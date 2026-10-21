// Writes the arch artwork used by CSS:
//   public/brand/arch.svg          filled silhouette, for masks
//   public/brand/arch-outline.svg  brass outline open at the bottom, for dish
//                                  placeholders (padded so the cusps aren't clipped)
// Run: node scripts/build-arch.mjs
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCH_PATH, ARCH_VIEWBOX } from "../src/design/arch.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { width, height } = ARCH_VIEWBOX;

const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${ARCH_PATH}"/></svg>\n`;
writeFileSync(join(root, "public/brand/arch.svg"), mask);

// 20 units of padding left/right and 2 on top. Keep in sync with .dish-ph::before.
const PAD_X = 20, PAD_TOP = 2;
const open = ARCH_PATH.replace(/Z$/, "");
const outline =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD_X} ${-PAD_TOP} ${width + 2 * PAD_X} ${height + PAD_TOP}" preserveAspectRatio="none">` +
  `<path d="${open}" fill="none" stroke="#b08d4f" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>\n`;
writeFileSync(join(root, "public/brand/arch-outline.svg"), outline);

console.log(`wrote arch.svg (${mask.length} B), arch-outline.svg (${outline.length} B)`);
