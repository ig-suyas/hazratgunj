import type { Category, Menu } from "@/lib/data";

/**
 * The menu as the page shows it. Sections printed as one but split by diet in
 * the data (the same printed name, tabs "Curries · Veg" and "Curries ·
 * Non-veg") become a single section, "Curries": the Veg / Non-veg filter
 * already does that split. Their sub-headings say which side a group is from
 * ("Veg · Signatures"). src/data/menu.json is not changed.
 */
export function menuView(menu: Menu): Menu {
  const merged = new Map<string, Category>(); // printed name → first category
  const target = new Map<string, Category>(); // category id → section it shows in
  const split = new Set<string>(); // ids of categories that were merged
  for (const c of menu.categories) {
    const first = merged.get(c.name);
    if (!first) {
      merged.set(c.name, c);
      target.set(c.id, c);
      continue;
    }
    split.add(first.id).add(c.id);
    target.set(c.id, first);
  }

  const categories = menu.categories
    .filter((c) => target.get(c.id) === c)
    .map((c) => (split.has(c.id) ? { ...c, tab: c.tab.split(" · ")[0], tagline: undefined } : c));
  const original = new Map(menu.categories.map((c) => [c.id, c]));

  const items = menu.items.map((item) => {
    if (!split.has(item.category)) return item;
    const side = original.get(item.category)!.tab.split(" · ")[1]; // "Veg" / "Non-veg"
    return { ...item, category: target.get(item.category)!.id, group: item.group ? `${side} · ${item.group}` : side };
  });

  return { ...menu, categories, items };
}
