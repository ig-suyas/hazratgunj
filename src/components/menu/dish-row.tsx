"use client";

import { memo } from "react";
import type { MenuItem, Tag } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { DietMarks } from "./diet-marks";
import { DishThumb } from "./dish-thumb";

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
  onOpen: (id: string) => void;
};

export const DishRow = memo(function DishRow({ item, onOpen }: Props) {
  const tags = item.tags.map((t) => TAG_LABEL[t]);

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_6.25rem] gap-x-3 rounded-card bg-beige/55 p-3">
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

      <DishThumb item={item} />
    </li>
  );
});
