"use client";

import { memo } from "react";
import type { MenuItem, Tag } from "@/lib/data";
import { isCustomisable, isOrderable } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { DietMarks } from "./diet-marks";
import { DishThumb } from "./dish-thumb";
import { Stepper } from "./stepper";

const TAG_LABEL: Record<Tag, string> = {
  bestseller: "Bestseller",
  signature: "Signature",
  new: "New",
  seasonal: "Seasonal",
  egg: "Contains egg",
};

export function priceText(item: MenuItem) {
  if (item.price === null) return item.priceLabel ?? "";
  return item.variants?.length ? `from ${formatPrice(item.price)}` : formatPrice(item.price);
}

type Props = {
  item: MenuItem;
  qty: number;
  onOpen: (id: string) => void;
  onAdd: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
};

export const DishRow = memo(function DishRow({ item, qty, onOpen, onAdd, onDecrement }: Props) {
  const orderable = isOrderable(item);
  const custom = isCustomisable(item);
  const tags = item.tags.map((t) => TAG_LABEL[t]);

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_6.25rem] gap-x-3 rounded-card bg-beige/55 p-3 pb-4">
      <div className="min-w-0 py-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <DietMarks item={item} />
          {tags.length > 0 && <span className="text-xs font-semibold tracking-wide text-brass-ink">{tags.join(" · ")}</span>}
        </div>
        <h3 className="mt-1.5 text-item font-semibold">
          {/* Stretched button: the whole card opens the dish. */}
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="text-left after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-bottle"
          >
            {item.name}
          </button>
        </h3>
        <p className="mt-1 font-semibold tabular">{priceText(item)}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
      </div>

      <div className="flex flex-col items-center">
        <DishThumb item={item} />
        <div className="relative z-[1] -mt-5 flex flex-col items-center">
          {!orderable ? (
            <span className="rounded-pill bg-paper px-3 py-1.5 text-xs font-semibold text-muted shadow-card">Ask staff</span>
          ) : qty > 0 ? (
            <Stepper
              qty={qty}
              label={item.name}
              onDecrement={() => onDecrement(item)}
              onIncrement={() => (custom ? onOpen(item.id) : onAdd(item))}
              className="w-[7rem] justify-between"
            />
          ) : (
            <button
              type="button"
              onClick={() => (custom ? onOpen(item.id) : onAdd(item))}
              aria-label={`Add ${item.name}`}
              className="h-11 min-w-[6rem] rounded-pill border border-bottle bg-paper px-5 font-semibold text-bottle shadow-card"
            >
              Add
            </button>
          )}
          {orderable && custom && <span className="mt-1 text-micro text-muted">Customisable</span>}
        </div>
      </div>
    </li>
  );
});
