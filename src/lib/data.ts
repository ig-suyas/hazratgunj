/**
 * The only door to restaurant data. Today it reads static JSON; swap these
 * bodies for API calls when a real backend exists — callers stay unchanged.
 */
import menuJson from "@/data/menu.json";

export type Tag = "new" | "bestseller" | "signature" | "seasonal" | "egg";

export type Choice = {
  label: string;
  /** Extra charge in INR, if any. */
  price?: number;
  /** Set to false when the choice makes the dish non-veg (e.g. chicken add-on). */
  veg?: boolean;
};

/** Single-select group, e.g. "Style: Steamed / Kurkure / Tandoori". */
export type OptionGroup = { id: string; label: string; required: boolean; choices: Choice[] };

/** Price-changing version of a dish, e.g. Veg 369 / Chicken 399. */
export type Variant = { id: string; label: string; price: number; veg: boolean };

export type MenuItem = {
  id: string;
  category: string;
  /** Sub-heading within the category, as printed (e.g. "Signatures"). */
  group?: string;
  name: string;
  description: string;
  /** "menu" = printed text; "options" = built from the printed choices; "written" = ours, needs owner review. */
  descriptionSource: "menu" | "options" | "written";
  /** INR. The lowest price when there are variants; null only for MRP items. */
  price: number | null;
  priceLabel?: string;
  /** False for items that can't be ordered from the table (e.g. MRP drinks). */
  orderable?: boolean;
  /** True only if every version of the dish is vegetarian. */
  veg: boolean;
  image: string | null;
  tags: Tag[];
  /** Source page in assets/source/menu. */
  page: number;
  variants?: Variant[];
  options?: OptionGroup[];
};

export type Category = {
  id: string;
  /** Name as printed on the menu. */
  name: string;
  /** Plain label for the tab bar. */
  tab: string;
  tagline?: string;
  prepTime?: string;
  note?: string;
  availability?: string;
  pages: number[];
};

export type Menu = {
  meta: { currency: "INR"; transcribedOn: string; source: string; taxNote: string; serviceNote: string };
  categories: Category[];
  items: MenuItem[];
};

// Shape is enforced by scripts/check-menu.mjs (run in `npm run check:menu`).
const menu = menuJson as unknown as Menu;

export async function getMenu(): Promise<Menu> {
  return menu;
}

export type OrderLine = {
  itemId: string;
  name: string;
  /** Variant and choices, e.g. "Chicken · Penne · Red Sauce". */
  detail: string;
  note: string;
  qty: number;
  unitPrice: number;
  veg: boolean;
};

export type Order = {
  number: string;
  table: string;
  placedAt: number;
  lines: OrderLine[];
  subtotal: number;
};

/**
 * DEMO ONLY: no network call is made and nothing reaches the kitchen.
 * A real backend replaces this body with a POST that validates prices
 * server-side and returns the kitchen's order number.
 */
export async function placeOrder(input: { table: string; lines: OrderLine[] }): Promise<Order> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return {
    number: `HG-${Math.floor(1000 + Math.random() * 9000)}`,
    table: input.table,
    placedAt: Date.now(),
    lines: input.lines,
    subtotal: input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
  };
}

export const isVegOption = (item: MenuItem) => item.veg || (item.variants?.some((v) => v.veg) ?? false);
