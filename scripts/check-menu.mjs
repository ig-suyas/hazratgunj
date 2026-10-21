// Validates src/data/menu.json. Run: npm run check:menu
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const menu = JSON.parse(readFileSync(join(root, "src/data/menu.json"), "utf8"));

const TAGS = new Set(["new", "bestseller", "signature", "seasonal", "egg"]);
const SOURCES = new Set(["menu", "options", "written"]);
const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const isPrice = (n) => Number.isInteger(n) && n > 0;

const cats = new Set();
for (const c of menu.categories) {
  if (cats.has(c.id)) fail(c.id, "duplicate category id");
  cats.add(c.id);
  if (!c.name || !c.tab) fail(c.id, "category needs name and tab");
}

const ids = new Set();
for (const it of menu.items) {
  const id = it.id ?? "(no id)";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(id, "id must be kebab-case");
  if (ids.has(id)) fail(id, "duplicate id");
  ids.add(id);
  if (!cats.has(it.category)) fail(id, `unknown category ${it.category}`);
  if (!it.name?.trim()) fail(id, "missing name");
  if (!it.description?.trim()) fail(id, "missing description");
  if (!SOURCES.has(it.descriptionSource)) fail(id, "bad descriptionSource");
  if (typeof it.veg !== "boolean") fail(id, "veg must be boolean");
  if (!("image" in it)) fail(id, "missing image field");
  if (!Array.isArray(it.tags) || it.tags.some((t) => !TAGS.has(t))) fail(id, `bad tags ${it.tags}`);
  if (!Number.isInteger(it.page)) fail(id, "missing source page");

  if (it.price === null) {
    if (!it.priceLabel || it.orderable !== false) fail(id, "null price needs priceLabel and orderable:false");
  } else if (!isPrice(it.price)) fail(id, `bad price ${it.price}`);

  if (it.variants) {
    if (it.variants.length < 2) fail(id, "variants need at least two entries");
    for (const v of it.variants) {
      if (!v.id || !v.label || !isPrice(v.price) || typeof v.veg !== "boolean") fail(id, `bad variant ${JSON.stringify(v)}`);
    }
    const min = Math.min(...it.variants.map((v) => v.price));
    if (it.price !== min) fail(id, `price ${it.price} should equal lowest variant ${min}`);
    const allVeg = it.variants.every((v) => v.veg);
    if (it.veg !== allVeg) fail(id, `veg should be ${allVeg} (all variants veg?)`);
  }
  for (const g of it.options ?? []) {
    if (!g.id || !g.label || typeof g.required !== "boolean" || !g.choices?.length) fail(id, `bad option group ${g.id}`);
    for (const ch of g.choices ?? []) {
      if (!ch.label) fail(id, "choice without label");
      if ("price" in ch && !isPrice(ch.price)) fail(id, `bad choice price ${ch.price}`);
    }
  }
}
for (const c of cats) if (!menu.items.some((i) => i.category === c)) fail(c, "category has no items");

if (errors.length) {
  console.error(`menu.json: ${errors.length} problem(s)\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

const written = menu.items.filter((i) => i.descriptionSource === "written").length;
console.log(`menu.json OK — ${menu.items.length} items in ${cats.size} categories`);
for (const c of menu.categories) {
  const n = menu.items.filter((i) => i.category === c.id).length;
  console.log(`  ${c.tab.padEnd(18)} ${String(n).padStart(3)}`);
}
console.log(`  descriptions written by us (need owner review): ${written}`);
