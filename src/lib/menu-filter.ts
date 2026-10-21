import type { Category, Menu, MenuItem } from "./data";

export type Diet = "all" | "veg" | "nonveg";

/** Which diet marks a dish carries. Mixed dishes (Veg / Chicken variants) carry both. */
export function diets(item: MenuItem) {
  return { veg: item.veg || (item.variants?.some((v) => v.veg) ?? false), nonveg: !item.veg };
}

export const matchesDiet = (item: MenuItem, diet: Diet) =>
  diet === "all" || (diet === "veg" ? diets(item).veg : diets(item).nonveg);

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Text a dish can be found by: name, description, section, group, variants and choices. */
export function searchIndex(menu: Menu): Map<string, string> {
  const cats = new Map(menu.categories.map((c) => [c.id, c]));
  return new Map(
    menu.items.map((item) => {
      const cat = cats.get(item.category);
      const parts = [
        item.name,
        item.description,
        cat?.name,
        cat?.tab,
        item.group,
        ...(item.variants?.map((v) => v.label) ?? []),
        ...(item.options?.flatMap((g) => g.choices.map((c) => c.label)) ?? []),
      ];
      return [item.id, normalise(parts.filter(Boolean).join(" "))];
    }),
  );
}

export type Section = { category: Category; items: MenuItem[] };

export function filterMenu(menu: Menu, index: Map<string, string>, query: string, diet: Diet): Section[] {
  const words = normalise(query).split(" ").filter(Boolean);
  const keep = (item: MenuItem) =>
    matchesDiet(item, diet) && words.every((w) => index.get(item.id)!.includes(w));
  return menu.categories
    .map((category) => ({ category, items: menu.items.filter((i) => i.category === category.id && keep(i)) }))
    .filter((s) => s.items.length > 0);
}

/** Letter for a dish's placeholder tile, skipping house words ("Signature Dal" → "D"). */
export function monogram(name: string) {
  const word = name.split(/\s+/).find((w) => !/^(signature|hazratgunj|the)$/i.test(w)) ?? name;
  return word.charAt(0).toUpperCase();
}
