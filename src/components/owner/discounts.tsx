"use client";

import { useDeferredValue, useId, useState } from "react";
import { useLive, useNow } from "@/components/app/hooks";
import { Badge, Button, ConfirmDialog, Dialog, Empty, ErrorState, Loading, PageHeader, Segmented, Switch, errorText, inputClass, toast } from "@/components/app/ui";
import { createDiscount, deleteDiscount, getMenu, listDiscounts, updateDiscount, type Discount, type DiscountTarget, type LiveMenu } from "@/lib/api";
import { addDays, dayKey, rangeLabel } from "@/lib/fmt";
import { discountLabel } from "@/lib/pricing";

function stateOf(d: Discount, today: string) {
  if (!d.enabled) return { tone: "muted" as const, label: "Off" };
  if (today < d.startsOn) return { tone: "brass" as const, label: "Scheduled" };
  if (today > d.endsOn) return { tone: "muted" as const, label: "Ended" };
  return { tone: "green" as const, label: "Running" };
}

/** Percentage or flat discounts on dishes or categories, with dates and an on/off switch. They reach the guest cart at once. */
export function Discounts() {
  const list = useLive(listDiscounts, "discounts", ["discounts"]);
  const menu = useLive(getMenu, "menu", ["menu"]);
  const [edit, setEdit] = useState<Discount | "new" | null>(null);
  const [remove, setRemove] = useState<Discount | null>(null);
  const today = dayKey(useNow(60_000));

  const targetText = (t: DiscountTarget) => {
    if (t.type === "all") return "Whole menu";
    const names = t.type === "categories" ? t.ids.map((id) => menu.data?.categories.find((c) => c.id === id)?.tab ?? id) : t.ids.map((id) => menu.data?.items.find((i) => i.id === id)?.name ?? id);
    return names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
  };

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Running discounts apply to guest carts automatically, with the menu price struck through."
        actions={
          <Button variant="primary" onClick={() => setEdit("new")}>
            New discount
          </Button>
        }
      />
      {list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading rows={3} />
      ) : list.data.length === 0 ? (
        <Empty title="No discounts yet" />
      ) : (
        <ul className="space-y-3">
          {list.data.map((d) => {
            const s = stateOf(d, today);
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-4 rounded-card border border-sand bg-paper p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{d.name}</span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </p>
                  <p className="text-sm text-muted">
                    <span className="font-semibold text-charcoal">{discountLabel(d)}</span> · {targetText(d.target)} · {rangeLabel(d.startsOn, d.endsOn)}
                  </p>
                </div>
                <Switch
                  checked={d.enabled}
                  label={`${d.name} on`}
                  onChange={async (v) => {
                    try {
                      await updateDiscount(d.id, { enabled: v });
                      toast(`${d.name} switched ${v ? "on" : "off"}`);
                    } catch (e) {
                      toast(errorText(e));
                    }
                  }}
                />
                <Button size="sm" onClick={() => setEdit(d)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-nonveg" onClick={() => setRemove(d)}>
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "New discount" : "Edit discount"} wide>
        {edit && menu.data && <DiscountForm key={edit === "new" ? "new" : edit.id} initial={edit === "new" ? null : edit} menu={menu.data} today={today} onDone={() => setEdit(null)} />}
      </Dialog>
      <ConfirmDialog
        open={!!remove}
        onClose={() => setRemove(null)}
        title={remove ? `Delete ${remove.name}?` : "Delete discount"}
        description="Orders already placed keep their prices."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!remove) return;
          await deleteDiscount(remove.id);
          toast("Discount deleted");
        }}
      />
    </>
  );
}

function DiscountForm({ initial, menu, today, onDone }: { initial: Discount | null; menu: LiveMenu; today: string; onDone: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<Discount["kind"]>(initial?.kind ?? "percent");
  const [value, setValue] = useState(initial ? String(initial.value) : "10");
  const [type, setType] = useState<DiscountTarget["type"]>(initial?.target.type ?? "categories");
  const [ids, setIds] = useState<string[]>(initial && initial.target.type !== "all" ? initial.target.ids : []);
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? today);
  const [endsOn, setEndsOn] = useState(initial?.endsOn ?? addDays(today, 14));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options =
    type === "categories"
      ? menu.categories.map((c) => ({ id: c.id, label: c.tab }))
      : menu.items.filter((i) => i.price !== null && (!q || i.name.toLowerCase().includes(q))).map((i) => ({ id: i.id, label: i.name }));
  const toggle = (x: string) => setIds((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]));

  const save = async () => {
    const d = {
      name,
      kind,
      value: Number(value),
      target: (type === "all" ? { type } : { type, ids }) as DiscountTarget,
      startsOn,
      endsOn,
      enabled,
    };
    setBusy(true);
    setError(null);
    try {
      if (initial) await updateDiscount(initial.id, d);
      else await createDiscount(d);
      toast(initial ? "Discount saved" : "Discount created");
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
        <input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Festive desserts" className={inputClass} />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Type</p>
          <Segmented
            label="Discount type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "percent", label: "Percentage" },
              { value: "flat", label: "Flat ₹ off" },
            ]}
          />
        </div>
        <div className="w-32">
          <label htmlFor={`${id}-v`} className="mb-1.5 block text-sm font-semibold">
            {kind === "percent" ? "Percent off" : "₹ off each"}
          </label>
          <input id={`${id}-v`} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))} className={`${inputClass} tabular`} />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Applies to</p>
        <Segmented
          label="Applies to"
          value={type}
          onChange={(t) => {
            setType(t);
            setIds([]);
          }}
          options={[
            { value: "categories", label: "Categories" },
            { value: "items", label: "Dishes" },
            { value: "all", label: "Whole menu" },
          ]}
        />
        {type !== "all" && (
          <fieldset className="mt-3">
            <legend className="sr-only">{type === "categories" ? "Categories" : "Dishes"}</legend>
            {type === "items" && (
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className={`${inputClass} mb-2`} />
            )}
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-thumb border border-sand bg-paper p-2 sm:grid-cols-2">
              {options.map((o) => (
                <label key={o.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xs px-2 hover:bg-cream">
                  <input type="checkbox" checked={ids.includes(o.id)} onChange={() => toggle(o.id)} className="size-4 accent-bottle" />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-sm text-muted tabular">{ids.length} selected</p>
          </fieldset>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-s`} className="mb-1.5 block text-sm font-semibold">
            Starts
          </label>
          <input id={`${id}-s`} type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${id}-e`} className="mb-1.5 block text-sm font-semibold">
            Ends
          </label>
          <input id={`${id}-e`} type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-end gap-3 pb-1.5">
          <Switch checked={enabled} onChange={setEnabled} label="Discount on" />
          <span className="font-semibold">{enabled ? "On" : "Off"}</span>
        </div>
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
          {initial ? "Save" : "Create discount"}
        </Button>
      </div>
    </div>
  );
}
