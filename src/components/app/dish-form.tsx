"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { Category } from "@/lib/api";
import { inputClass, selectClass, textareaClass } from "./ui";

export type DishDraft = { name: string; category: string; veg: boolean; price: number; description: string };

/** Fields for a dish: used to suggest one (staff), add or edit one, and review a suggestion (owner). */
export function DishForm({
  categories,
  initial,
  onSubmit,
  footer,
  showPhoto = true,
}: {
  categories: Category[];
  initial?: Partial<DishDraft>;
  onSubmit: (d: DishDraft) => void;
  footer: (state: { valid: boolean }) => ReactNode;
  showPhoto?: boolean;
}) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.id ?? "");
  const [veg, setVeg] = useState(initial?.veg ?? true);
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tried, setTried] = useState(false);
  const valid = name.trim().length > 1 && Number(price) > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (valid) onSubmit({ name: name.trim(), category, veg, price: Math.round(Number(price)), description: description.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-semibold">
          Dish name
        </label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} aria-invalid={tried && name.trim().length < 2} />
        {tried && name.trim().length < 2 && <p className="mt-1 text-sm font-semibold text-nonveg">Enter the dish name.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-cat`} className="mb-1.5 block text-sm font-semibold">
            Category
          </label>
          <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tab}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-price`} className="mb-1.5 block text-sm font-semibold">
            Price (₹)
          </label>
          <input
            id={`${id}-price`}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className={`${inputClass} tabular`}
            aria-invalid={tried && !(Number(price) > 0)}
          />
          {tried && !(Number(price) > 0) && <p className="mt-1 text-sm font-semibold text-nonveg">Enter a price.</p>}
        </div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Type</legend>
        <div className="flex gap-2">
          {(
            [
              [true, "Veg"],
              [false, "Non-veg"],
            ] as const
          ).map(([v, label]) => (
            <label key={label} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-sand bg-paper px-4 has-checked:border-bottle has-checked:shadow-ring">
              <input type="radio" name={`${id}-veg`} checked={veg === v} onChange={() => setVeg(v)} className="size-4 accent-bottle" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-desc`} className="mb-1.5 block text-sm font-semibold">
          Description
        </label>
        <textarea id={`${id}-desc`} rows={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
      </div>
      {showPhoto && (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Photo</p>
          <div className="dish-photo-slot grid h-24 place-items-center rounded-thumb border border-dashed border-brass bg-cream text-sm text-muted">Photo upload comes with the real system</div>
        </div>
      )}
      {footer({ valid })}
    </form>
  );
}
