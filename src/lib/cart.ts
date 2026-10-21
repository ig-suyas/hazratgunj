import type { MenuItem } from "./data";

/** Chosen option per group: group id → choice label (null = none chosen). */
export type Selection = Record<string, string | null>;

export type CartLine = {
  id: string;
  itemId: string;
  variantId: string | null;
  selection: Selection;
  note: string;
  qty: number;
};

export type LineChoice = Omit<CartLine, "id" | "qty">;

export const NOTE_MAX = 150;
export const NOTE_PLACEHOLDER = "e.g. no onions, extra spicy";

export const isCustomisable = (item: MenuItem) => !!(item.variants?.length || item.options?.length);
export const isOrderable = (item: MenuItem) => item.orderable !== false && item.price !== null;

export function variantOf(item: MenuItem, variantId: string | null) {
  return item.variants?.find((v) => v.id === variantId) ?? null;
}

function chosen(item: MenuItem, selection: Selection) {
  return (item.options ?? []).flatMap((g) => {
    const c = g.choices.find((ch) => ch.label === selection[g.id]);
    return c ? [c] : [];
  });
}

/** Price of one unit: variant (or base) price plus paid add-ons. */
export function unitPrice(item: MenuItem, variantId: string | null, selection: Selection): number {
  const base = variantOf(item, variantId)?.price ?? item.price ?? 0;
  return base + chosen(item, selection).reduce((sum, c) => sum + (c.price ?? 0), 0);
}

/** Veg unless the variant or an add-on (e.g. chicken extra) makes it non-veg. */
export function isVegChoice(item: MenuItem, variantId: string | null, selection: Selection): boolean {
  const v = variantOf(item, variantId);
  return (v ? v.veg : item.veg) && chosen(item, selection).every((c) => c.veg !== false);
}

/** "Chicken · Penne · Red Sauce" */
export function choiceDetail(item: MenuItem, variantId: string | null, selection: Selection): string {
  const v = variantOf(item, variantId);
  const parts = v ? [v.label] : [];
  for (const g of item.options ?? []) {
    const label = selection[g.id];
    if (label) parts.push(label);
  }
  return parts.join(" · ");
}

const selectionKey = (s: Selection) =>
  Object.keys(s)
    .sort()
    .map((k) => `${k}=${s[k] ?? ""}`)
    .join("&");

const sameChoice = (a: LineChoice, b: LineChoice) =>
  a.itemId === b.itemId &&
  a.variantId === b.variantId &&
  a.note.trim() === b.note.trim() &&
  selectionKey(a.selection) === selectionKey(b.selection);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export type CartAction =
  | { type: "add"; choice: LineChoice; qty: number }
  | { type: "qty"; id: string; qty: number }
  | { type: "note"; id: string; note: string }
  | { type: "decrementItem"; itemId: string }
  | { type: "load"; lines: CartLine[] }
  | { type: "clear" };

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const choice = { ...action.choice, note: action.choice.note.slice(0, NOTE_MAX) };
      const same = lines.find((l) => sameChoice(l, choice));
      if (same) return lines.map((l) => (l === same ? { ...l, qty: l.qty + action.qty } : l));
      return [...lines, { ...choice, id: newId(), qty: action.qty }];
    }
    case "qty":
      return action.qty <= 0
        ? lines.filter((l) => l.id !== action.id)
        : lines.map((l) => (l.id === action.id ? { ...l, qty: Math.min(action.qty, 99) } : l));
    case "note":
      return lines.map((l) => (l.id === action.id ? { ...l, note: action.note.slice(0, NOTE_MAX) } : l));
    case "decrementItem": {
      // Remove one from the most recently added line of this dish.
      const last = [...lines].reverse().find((l) => l.itemId === action.itemId);
      return last ? cartReducer(lines, { type: "qty", id: last.id, qty: last.qty - 1 }) : lines;
    }
    case "load":
      return action.lines;
    case "clear":
      return [];
  }
}
