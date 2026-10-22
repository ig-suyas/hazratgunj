"use client";

import { useId, useRef, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import { DishPlaceholder } from "@/components/dish-placeholder";
import type { Category, MenuItem } from "@/lib/data";
import {
  NOTE_MAX,
  NOTE_PLACEHOLDER,
  isOrderable,
  isVegChoice,
  unitPrice,
  type LineChoice,
  type Selection,
} from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Diet } from "@/lib/menu-filter";
import { DietMarks } from "./diet-marks";
import { dishPhoto } from "./dish-photo";
import { CloseIcon } from "./icons";
import { DiscountedPrice, priceText } from "./dish-row";
import { Stepper } from "./stepper";

type Props = {
  item: MenuItem;
  category: Category | undefined;
  diet: Diet;
  /** Unit price after any running discount. */
  priceOf: (item: MenuItem, unit: number) => number;
  onAdd: (choice: LineChoice, qty: number) => void;
  onClose: () => void;
};

function defaultVariant(item: MenuItem, diet: Diet) {
  const vs = item.variants;
  if (!vs?.length) return null;
  const pick = diet === "veg" ? vs.find((v) => v.veg) : diet === "nonveg" ? vs.find((v) => !v.veg) : undefined;
  return (pick ?? vs[0]).id;
}

/**
 * The dish sheet when the guest can order: versions, choices, a note for the
 * kitchen and the quantity. Mount with key={item.id} so state resets per dish.
 */
export function DishOrderSheetBody({ item, category, diet, priceOf, onAdd, onClose }: Props) {
  const uid = useId();
  const [variantId, setVariantId] = useState<string | null>(() => defaultVariant(item, diet));
  const [selection, setSelection] = useState<Selection>(() =>
    Object.fromEntries((item.options ?? []).map((g) => [g.id, null])),
  );
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState<string[]>([]);
  const groupRefs = useRef<Record<string, HTMLFieldSetElement | null>>({});

  const orderable = isOrderable(item);
  const photo = dishPhoto(item);
  const list = unitPrice(item, variantId, selection);
  const price = priceOf(item, list);
  const basePrice = item.price === null ? null : priceOf(item, item.price);
  const veg = isVegChoice(item, variantId, selection);
  const meta = [category?.prepTime && `Ready in ${category.prepTime}`, category?.availability].filter(Boolean);

  const choose = (groupId: string, label: string | null) => {
    setSelection((s) => ({ ...s, [groupId]: label }));
    setMissing((m) => m.filter((id) => id !== groupId));
  };

  const submit = () => {
    const unmet = (item.options ?? []).filter((g) => g.required && !selection[g.id]).map((g) => g.id);
    if (unmet.length) {
      setMissing(unmet);
      groupRefs.current[unmet[0]]?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    onAdd({ itemId: item.id, variantId, selection, note: note.trim() }, qty);
  };

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

        <div className="space-y-6 px-5 pt-5 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DietMarks item={item} />
              {category && <span className="text-xs font-semibold tracking-wide text-brass-ink uppercase">{category.tab}</span>}
            </div>
            <h2 id="dish-title" className="mt-2 font-display text-title font-semibold">
              {item.name}
            </h2>
            <p className="mt-1 text-lg font-semibold tabular">
              {basePrice !== null && basePrice < item.price! ? <DiscountedPrice item={item} unit={basePrice} /> : priceText(item)}
            </p>
            <p className="mt-2 text-base text-muted">{item.description}</p>
            {(meta.length > 0 || category?.note) && (
              <p className="mt-2 text-sm text-muted">{[...meta, category?.note].filter(Boolean).join(" · ")}</p>
            )}
          </div>

          {orderable && item.variants && (
            <fieldset>
              <legend className="mb-1 flex w-full justify-between text-sm font-semibold">
                Choose one <span className="font-normal text-muted">Required</span>
              </legend>
              {item.variants.map((v) => (
                <label key={v.id} className="flex min-h-tap cursor-pointer items-center gap-3 border-b border-sand py-2">
                  <input
                    type="radio"
                    name={`${uid}-variant`}
                    checked={variantId === v.id}
                    onChange={() => setVariantId(v.id)}
                    className="size-5 accent-bottle"
                  />
                  <DietMark veg={v.veg} />
                  <span className="flex-1">{v.label}</span>
                  <span className="font-semibold tabular">{formatPrice(v.price)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {orderable &&
            item.options?.map((g) => {
              const isMissing = missing.includes(g.id);
              const choices = g.required ? g.choices : [{ label: "None" }, ...g.choices];
              return (
                <fieldset
                  key={g.id}
                  ref={(el) => {
                    groupRefs.current[g.id] = el;
                  }}
                  aria-describedby={isMissing ? `${uid}-${g.id}-err` : undefined}
                >
                  <legend className="mb-1 flex w-full justify-between text-sm font-semibold">
                    {g.label} <span className="font-normal text-muted">{g.required ? "Required" : "Optional"}</span>
                  </legend>
                  {isMissing && (
                    <p id={`${uid}-${g.id}-err`} className="mb-1 text-sm font-semibold text-nonveg">
                      Please choose one.
                    </p>
                  )}
                  {choices.map((c) => {
                    const value = c.label === "None" && !g.required ? null : c.label;
                    return (
                      <label key={c.label} className="flex min-h-tap cursor-pointer items-center gap-3 border-b border-sand py-2">
                        <input
                          type="radio"
                          name={`${uid}-${g.id}`}
                          checked={selection[g.id] === value}
                          onChange={() => choose(g.id, value)}
                          className="size-5 accent-bottle"
                        />
                        {"veg" in c && c.veg === false && <DietMark veg={false} />}
                        <span className="flex-1">{c.label}</span>
                        {"price" in c && c.price ? <span className="text-muted tabular">+{formatPrice(c.price)}</span> : null}
                      </label>
                    );
                  })}
                </fieldset>
              );
            })}

          {orderable && (
            <div>
              <label htmlFor={`${uid}-note`} className="flex justify-between text-sm font-semibold">
                Note for the kitchen <span className="font-normal text-muted">Optional</span>
              </label>
              <textarea
                id={`${uid}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                maxLength={NOTE_MAX}
                rows={2}
                placeholder={NOTE_PLACEHOLDER}
                className="mt-2 block w-full resize-none rounded-thumb border border-sand bg-paper px-3 py-2.5 text-base placeholder:text-muted/80 focus:border-bottle"
              />
              <p className="mt-1 text-right text-xs text-muted tabular" aria-live="polite">
                {note.length}/{NOTE_MAX}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="sheet-footer">
        {orderable ? (
          <div className="flex items-center gap-3">
            <Stepper
              qty={qty}
              label={item.name}
              tone="outline"
              onDecrement={() => setQty((q) => Math.max(1, q - 1))}
              onIncrement={() => setQty((q) => Math.min(99, q + 1))}
            />
            <button
              type="button"
              onClick={submit}
              className="flex h-12 flex-1 items-center justify-between gap-2 rounded-pill bg-bottle px-5 font-semibold text-paper shadow-card active:bg-bottle-deep"
            >
              <span className="flex items-center gap-2">
                Add <DietMark veg={veg} size={14} className="rounded-xs bg-paper" />
              </span>
              <span className="tabular">
                {price < list && <s className="mr-1.5 font-normal opacity-75">{formatPrice(list * qty)}</s>}
                {formatPrice(price * qty)}
              </span>
            </button>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-muted">Sold at MRP. Please ask your server.</p>
        )}
      </footer>
    </>
  );
}
