"use client";

import { DietMark } from "@/components/diet-mark";
import { DishPlaceholder } from "@/components/dish-placeholder";
import type { Category, MenuItem } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { DietMarks } from "./diet-marks";
import { dishPhoto } from "./dish-photo";
import { CloseIcon } from "./icons";
import { priceText } from "./dish-row";

type Props = {
  item: MenuItem;
  category: Category | undefined;
  onClose: () => void;
};

/** Dish details, read-only: photo, description, versions and choices with their prices. */
export function DishSheetBody({ item, category, onClose }: Props) {
  const photo = dishPhoto(item);
  const meta = [category?.prepTime && `Ready in ${category.prepTime}`, category?.availability].filter(Boolean);

  return (
    <>
      <div className="sheet-body">
        {/* Large image: arch-framed photo, or the dish name set in the arch */}
        <div className="relative flex justify-center bg-beige px-6 pt-7">
          <div className="aspect-[4/5] h-[clamp(10rem,30dvh,17rem)] [container-type:inline-size]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP from the image pipeline
              <img src={`${photo.src}-full.webp`} alt={item.name} className="mask-arch h-full w-full object-cover" />
            ) : (
              <DishPlaceholder label={item.name} className="rounded-none! bg-transparent!" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 grid size-11 place-items-center rounded-pill bg-paper/90 text-charcoal shadow-card"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-6 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DietMarks item={item} />
              {category && <span className="text-xs font-semibold tracking-wide text-brass-ink uppercase">{category.tab}</span>}
            </div>
            <h2 id="dish-title" className="mt-2 font-display text-title font-semibold">
              {item.name}
            </h2>
            <p className="mt-1 text-lg font-semibold tabular">{priceText(item)}</p>
            <p className="mt-2 text-base text-muted">{item.description}</p>
            {(meta.length > 0 || category?.note) && (
              <p className="mt-2 text-sm text-muted">{[...meta, category?.note].filter(Boolean).join(" · ")}</p>
            )}
          </div>

          {item.variants && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Available as</h3>
              <ul>
                {item.variants.map((v) => (
                  <li key={v.id} className="flex min-h-tap items-center gap-3 border-b border-sand py-2">
                    <DietMark veg={v.veg} />
                    <span className="flex-1">{v.label}</span>
                    <span className="font-semibold tabular">{formatPrice(v.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.options?.map((g) => (
            <div key={g.id}>
              <h3 className="mb-1 flex justify-between text-sm font-semibold">
                {g.label} <span className="font-normal text-muted">{g.required ? "Choose one" : "Optional"}</span>
              </h3>
              <ul>
                {g.choices.map((c) => (
                  <li key={c.label} className="flex min-h-tap items-center gap-3 border-b border-sand py-2">
                    {c.veg === false && <DietMark veg={false} />}
                    <span className="flex-1">{c.label}</span>
                    {c.price ? <span className="text-muted tabular">+{formatPrice(c.price)}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
