/**
 * Discount rules, shared by the guest cart (to show prices) and the mock
 * backend (which re-prices every order itself, as a real server must).
 */

export type DiscountTarget = { type: "all" } | { type: "items"; ids: string[] } | { type: "categories"; ids: string[] };

export type Discount = {
  id: string;
  name: string;
  kind: "percent" | "flat";
  /** Percent off, or rupees off each unit. */
  value: number;
  target: DiscountTarget;
  /** IST day keys, both inclusive. */
  startsOn: string;
  endsOn: string;
  enabled: boolean;
  createdAt: number;
};

export const discountRunning = (d: Discount, day: string) => d.enabled && d.startsOn <= day && day <= d.endsOn;

function applies(d: Discount, itemId: string, categoryId: string) {
  if (d.target.type === "all") return true;
  if (d.target.type === "items") return d.target.ids.includes(itemId);
  return d.target.ids.includes(categoryId);
}

/** Rupees off one unit; flat discounts never take a price below zero. */
export function saving(d: Discount, unit: number) {
  const off = d.kind === "percent" ? Math.round((unit * d.value) / 100) : d.value;
  return Math.max(0, Math.min(unit, off));
}

/** The best running discount for a dish, and the unit price after it. */
export function bestPrice(unit: number, itemId: string, categoryId: string, discounts: Discount[], day: string) {
  let best: Discount | null = null;
  let off = 0;
  for (const d of discounts) {
    if (!discountRunning(d, day) || !applies(d, itemId, categoryId)) continue;
    const s = saving(d, unit);
    if (s > off) {
      off = s;
      best = d;
    }
  }
  return { unit: unit - off, list: unit, discount: best };
}

/** "15% off", "₹30 off". */
export const discountLabel = (d: Pick<Discount, "kind" | "value">) => (d.kind === "percent" ? `${d.value}% off` : `₹${d.value} off`);
