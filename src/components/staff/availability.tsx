"use client";

import { useDeferredValue, useId, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import { useLive } from "@/components/app/hooks";
import { Empty, ErrorState, Loading, Segmented, Switch, errorText, inputClass, toast } from "@/components/app/ui";
import { getMenu, setItemAvailability } from "@/lib/api";
import { money } from "@/lib/fmt";

/** Out-of-stock switches for every dish, with search. Changes reach guest menus at once. */
export function Availability() {
  const id = useId();
  const menu = useLive(getMenu, "menu", ["menu"]);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "out">("all");
  const [pending, setPending] = useState<string | null>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  if (menu.error && !menu.data) return <ErrorState error={menu.error} onRetry={menu.reload} />;
  if (!menu.data) return <Loading label="Loading the menu" />;

  const cats = new Map(menu.data.categories.map((c) => [c.id, c.tab]));
  const items = menu.data.items.filter((i) => (show === "all" || !i.available) && (!q || i.name.toLowerCase().includes(q) || cats.get(i.category)?.toLowerCase().includes(q)));
  const outCount = menu.data.items.filter((i) => !i.available).length;

  const toggle = async (itemId: string, name: string, available: boolean) => {
    setPending(itemId);
    try {
      await setItemAvailability(itemId, available);
      toast(available ? `${name} is back in stock` : `${name} marked out of stock`);
    } catch (e) {
      toast(errorText(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search dishes
        </label>
        <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" className={`${inputClass} max-w-sm flex-1`} />
        <Segmented
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: "all", label: "All" },
            { value: "out", label: "Out of stock", count: outCount },
          ]}
        />
      </div>
      {items.length === 0 ? (
        <Empty title={show === "out" ? "Everything is in stock" : "No dishes found"} />
      ) : (
        <ul className="divide-y divide-sand rounded-card border border-sand bg-paper">
          {items.map((i) => (
            <li key={i.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
              <DietMark veg={i.veg} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={`text-lg font-semibold ${i.available ? "" : "text-muted line-through decoration-sand"}`}>{i.name}</p>
                <p className="text-sm text-muted">
                  {cats.get(i.category)}
                  {i.price !== null && <span className="tabular"> · {money(i.price)}</span>}
                </p>
              </div>
              <span className={`hidden text-sm font-semibold sm:inline ${i.available ? "text-bottle" : "text-nonveg"}`}>{i.available ? "In stock" : "Out of stock"}</span>
              <Switch checked={i.available} disabled={pending === i.id} onChange={(v) => toggle(i.id, i.name, v)} label={`${i.name} in stock`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
