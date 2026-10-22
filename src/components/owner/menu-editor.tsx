"use client";

import { useDeferredValue, useId, useState } from "react";
import { DishForm } from "@/components/app/dish-form";
import { useLive } from "@/components/app/hooks";
import { Button, Card, ConfirmDialog, Dialog, Empty, ErrorState, Loading, PageHeader, Switch, errorText, inputClass, selectClass, textareaClass, toast } from "@/components/app/ui";
import { DietMark } from "@/components/diet-mark";
import {
  addMenuItem,
  deleteMenuItem,
  getMenu,
  reorderCategories,
  setItemAvailability,
  updateMenuItem,
  type Category,
  type LiveItem,
} from "@/lib/api";
import { money } from "@/lib/fmt";

/** The owner edits the live menu: prices, names, categories, stock, new dishes and category order. */
export function MenuEditor() {
  const id = useId();
  const menu = useLive(getMenu, "menu", ["menu"]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState<LiveItem | null>(null);
  const [remove, setRemove] = useState<LiveItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const q = useDeferredValue(query.trim().toLowerCase());

  if (menu.error && !menu.data) return <ErrorState error={menu.error} onRetry={menu.reload} />;
  if (!menu.data) return <Loading rows={6} />;
  const { categories, items } = menu.data;
  const shown = categories
    .filter((c) => cat === "all" || c.id === cat)
    .map((c) => ({ c, list: items.filter((i) => i.category === c.id && (!q || i.name.toLowerCase().includes(q))) }))
    .filter((g) => g.list.length > 0);

  return (
    <>
      <PageHeader
        title="Menu"
        description="Changes go live on the guest menu immediately."
        actions={
          <>
            <Button onClick={() => setOrdering(true)}>Reorder categories</Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              Add a dish
            </Button>
          </>
        }
      />
      <Card className="mb-4 flex flex-wrap gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor={`${id}-q`} className="sr-only">
            Search dishes
          </label>
          <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" className={inputClass} />
        </div>
        <div className="w-56">
          <label htmlFor={`${id}-c`} className="sr-only">
            Category
          </label>
          <select id={`${id}-c`} value={cat} onChange={(e) => setCat(e.target.value)} className={selectClass}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tab}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {shown.length === 0 ? (
        <Empty title="No dishes found" />
      ) : (
        <div className="space-y-6">
          {shown.map(({ c, list }) => (
            <section key={c.id} aria-labelledby={`${id}-${c.id}`}>
              <h2 id={`${id}-${c.id}`} className="mb-2 text-lg font-semibold">
                {c.tab} <span className="text-sm font-normal text-muted tabular">· {list.length}</span>
              </h2>
              <ul className="divide-y divide-sand rounded-card border border-sand bg-paper">
                {list.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                    <DietMark veg={i.veg} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {i.name}
                        {i.addedOn && <span className="ml-2 text-sm font-normal text-brass-ink">Added</span>}
                      </p>
                      <p className="truncate text-sm text-muted">{i.description}</p>
                    </div>
                    <span className="w-28 text-right font-semibold tabular">
                      {i.price === null ? i.priceLabel ?? "MRP" : `${i.variants?.length ? "from " : ""}${money(i.price)}`}
                    </span>
                    <Switch
                      checked={i.available}
                      onChange={async (v) => {
                        try {
                          await setItemAvailability(i.id, v);
                          toast(v ? `${i.name} is in stock` : `${i.name} is out of stock`);
                        } catch (e) {
                          toast(errorText(e));
                        }
                      }}
                      label={`${i.name} in stock`}
                    />
                    <Button size="sm" onClick={() => setEdit(i)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-nonveg" onClick={() => setRemove(i)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit ${edit.name}` : "Edit dish"} wide>
        {edit && <EditForm key={edit.id} item={edit} categories={categories} onDone={() => setEdit(null)} />}
      </Dialog>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a dish" wide>
        {adding && (
          <DishForm
            categories={categories}
            onSubmit={async (d) => {
              try {
                await addMenuItem(d);
                toast(`${d.name} added to the menu`);
                setAdding(false);
              } catch (e) {
                toast(errorText(e));
              }
            }}
            footer={() => (
              <div className="flex justify-end gap-2 border-t border-sand pt-4">
                <Button variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Add to menu
                </Button>
              </div>
            )}
          />
        )}
      </Dialog>
      <ConfirmDialog
        open={!!remove}
        onClose={() => setRemove(null)}
        title={remove ? `Delete ${remove.name}?` : "Delete dish"}
        description="It disappears from the guest menu at once. Past orders keep it."
        confirmLabel="Delete dish"
        tone="danger"
        onConfirm={async () => {
          if (!remove) return;
          await deleteMenuItem(remove.id);
          toast(`${remove.name} deleted`);
        }}
      />
      <Dialog open={ordering} onClose={() => setOrdering(false)} title="Category order" description="Guests see the categories in this order.">
        <CategoryOrder categories={categories} />
      </Dialog>
    </>
  );
}

function EditForm({ item, categories, onDone }: { item: LiveItem; categories: Category[]; onDone: () => void }) {
  const id = useId();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [price, setPrice] = useState(String(item.price ?? ""));
  const [variants, setVariants] = useState(item.variants?.map((v) => ({ ...v, text: String(v.price) })) ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mrp = item.price === null;

  const save = async () => {
    const vs = variants?.map(({ text, ...v }) => ({ ...v, price: Number(text) }));
    if (!name.trim()) return setError("Enter the dish name.");
    if (vs?.some((v) => !(v.price > 0)) || (!vs && !mrp && !(Number(price) > 0))) return setError("Enter every price.");
    setBusy(true);
    try {
      await updateMenuItem(item.id, {
        name: name.trim(),
        description: description.trim(),
        category,
        ...(mrp ? {} : vs ? { variants: vs, price: Math.min(...vs.map((v) => v.price)) } : { price: Math.round(Number(price)) }),
      });
      toast(`${name.trim()} saved`);
      onDone();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-n`} className="mb-1.5 block text-sm font-semibold">
          Name
        </label>
        <input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-c`} className="mb-1.5 block text-sm font-semibold">
            Category
          </label>
          <select id={`${id}-c`} value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tab}
              </option>
            ))}
          </select>
        </div>
        {!variants && !mrp && (
          <div>
            <label htmlFor={`${id}-p`} className="mb-1.5 block text-sm font-semibold">
              Price (₹)
            </label>
            <input id={`${id}-p`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 5))} className={`${inputClass} tabular`} />
          </div>
        )}
      </div>
      {variants && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Prices (₹)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {variants.map((v, n) => (
              <label key={v.id} className="flex items-center gap-3">
                <span className="w-24 text-sm">{v.label}</span>
                <input
                  inputMode="numeric"
                  value={v.text}
                  onChange={(e) => setVariants(variants.map((x, k) => (k === n ? { ...x, text: e.target.value.replace(/\D/g, "").slice(0, 5) } : x)))}
                  className={`${inputClass} tabular`}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {mrp && <p className="text-sm text-muted">Sold at MRP: no menu price.</p>}
      <div>
        <label htmlFor={`${id}-d`} className="mb-1.5 block text-sm font-semibold">
          Description
        </label>
        <textarea id={`${id}-d`} rows={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className={textareaClass} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" busy={busy} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

function CategoryOrder({ categories }: { categories: Category[] }) {
  const move = async (from: number, to: number) => {
    const ids = categories.map((c) => c.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    await reorderCategories(ids);
  };
  return (
    <ol className="divide-y divide-sand rounded-card border border-sand">
      {categories.map((c, i) => (
        <li key={c.id} className="flex items-center gap-2 px-3 py-1.5">
          <span className="w-6 text-sm text-muted tabular">{i + 1}</span>
          <span className="flex-1 font-semibold">{c.tab}</span>
          <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${c.tab} up`}>
            Up
          </Button>
          <Button size="sm" variant="ghost" disabled={i === categories.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${c.tab} down`}>
            Down
          </Button>
        </li>
      ))}
    </ol>
  );
}
