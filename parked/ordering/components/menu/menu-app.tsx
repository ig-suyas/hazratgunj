"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import { Logo } from "@/components/logo";
import { cartReducer, choiceDetail, isVegChoice, unitPrice, type CartAction, type CartLine, type LineChoice } from "@/lib/cart";
import { placeOrder, type Menu, type MenuItem, type Order } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { filterMenu, searchIndex, type Diet } from "@/lib/menu-filter";
import { CartSheetBody } from "./cart-sheet";
import { CategoryNav, sectionId } from "./category-nav";
import { DishRow } from "./dish-row";
import { DishSheetBody } from "./dish-sheet";
import { readSession, useEvent, useQrTable, useSessionValue, writeSession } from "./hooks";
import { CloseIcon, SearchIcon } from "./icons";
import { ORDER_STEPS, OrderViewBody, useSimulatedStatus } from "./order-view";
import { Sheet } from "./sheet";

type Panel = "dish" | "cart" | "order" | null;

const DIETS: { value: Diet; label: string }[] = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg" },
  { value: "nonveg", label: "Non-veg" },
];

export function MenuApp({ menu, taxNote }: { menu: Menu; taxNote: string }) {
  const items = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu]);
  const categories = useMemo(() => new Map(menu.categories.map((c) => [c.id, c])), [menu]);
  const index = useMemo(() => searchIndex(menu), [menu]);

  // Filters
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const deferredQuery = useDeferredValue(query);
  const sections = useMemo(() => filterMenu(menu, index, deferredQuery, diet), [menu, index, deferredQuery, diet]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cart, table and the last order survive a refresh (sessionStorage).
  const [savedLines] = useSessionValue<CartLine[]>("hg-cart", []);
  const lines = useMemo(() => savedLines.filter((l) => items.has(l.itemId)), [savedLines, items]);
  const dispatch = useCallback((action: CartAction) => {
    writeSession("hg-cart", cartReducer(readSession<CartLine[]>("hg-cart", []), action));
  }, []);

  const qrTable = useQrTable();
  const [typedTable, setTypedTable] = useSessionValue<string>("hg-table", "");
  const table = qrTable ?? (typedTable || null);
  const [order, setOrder] = useSessionValue<Order | null>("hg-order", null);

  // Panels
  const [panel, setPanel] = useState<Panel>(null);
  const [dishId, setDishId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const dish = dishId ? items.get(dishId) : undefined;

  const qtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty);
    return m;
  }, [lines]);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => {
    const item = items.get(l.itemId);
    return item ? s + unitPrice(item, l.variantId, l.selection) * l.qty : s;
  }, 0);

  const openDish = useEvent((id: string) => {
    setDishId(id);
    setPanel("dish");
  });
  const quickAdd = useEvent((item: MenuItem) => {
    dispatch({ type: "add", choice: { itemId: item.id, variantId: null, selection: {}, note: "" }, qty: 1 });
  });
  const decrement = useEvent((item: MenuItem) => dispatch({ type: "decrementItem", itemId: item.id }));
  const addFromSheet = (choice: LineChoice, qty: number) => {
    dispatch({ type: "add", choice, qty });
    setPanel(null);
  };

  const submitOrder = async () => {
    if (!table || placing) return;
    setPlacing(true);
    const orderLines = lines.flatMap((l) => {
      const item = items.get(l.itemId);
      if (!item) return [];
      return [
        {
          itemId: item.id,
          name: item.name,
          detail: choiceDetail(item, l.variantId, l.selection),
          note: l.note,
          qty: l.qty,
          unitPrice: unitPrice(item, l.variantId, l.selection),
          veg: isVegChoice(item, l.variantId, l.selection),
        },
      ];
    });
    const placed = await placeOrder({ table, lines: orderLines });
    setOrder(placed);
    dispatch({ type: "clear" });
    setPlacing(false);
    setPanel("order");
  };

  const step = useSimulatedStatus(order);
  const empty = sections.length === 0;

  return (
    <div className="menu-root min-h-dvh bg-cream pb-32">
      <header className="mx-auto max-w-2xl px-gutter pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} aria-label="Hazratgunj home" className="block py-1">
            <Logo size={56} priority alt="Hazratgunj Restaurant and Banquet, home" />
          </Link>
          {table && (
            <span className="rounded-pill border border-brass px-3.5 py-1.5 text-sm font-semibold text-brass-ink tabular">Table {table}</span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <h1 className="font-display text-headline font-medium">Menu</h1>
          <p className="pb-2 text-right text-sm text-muted">Prices in ₹, taxes extra</p>
        </div>
        <div className="hairline mt-2" />

        <div className="mt-4 space-y-3">
          <div className="relative">
            <label htmlFor="menu-search" className="sr-only">
              Search dishes
            </label>
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              id="menu-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, e.g. paneer"
              className="h-12 w-full rounded-pill border border-sand bg-paper pr-12 pl-12 text-base placeholder:text-muted/80 focus:border-bottle [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-muted"
              >
                <CloseIcon className="size-4" />
              </button>
            )}
          </div>

          <div role="radiogroup" aria-label="Diet" className="flex gap-2">
            {DIETS.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={diet === d.value}
                onClick={() => setDiet(d.value)}
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-sand bg-paper px-4 text-sm font-semibold text-muted aria-checked:border-bottle aria-checked:text-bottle aria-checked:shadow-ring"
              >
                {d.value !== "all" && <DietMark veg={d.value === "veg"} size={14} />}
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-4">
        <CategoryNav categories={sections.map((s) => s.category)} searchRef={searchRef} />
      </div>

      <main className="mx-auto max-w-2xl px-gutter">
        {empty ? (
          <div className="py-16 text-center">
            <p className="text-lg">
              No dishes match{query ? <> “{query}”</> : " this filter"}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDiet("all");
              }}
              className="mt-4 h-11 rounded-pill border border-bottle px-5 font-semibold text-bottle"
            >
              Show the full menu
            </button>
          </div>
        ) : (
          sections.map(({ category, items: list }) => {
            const meta = [category.prepTime && `Ready in ${category.prepTime}`, category.availability].filter(Boolean).join(" · ");
            let lastGroup: string | undefined;
            return (
              <section key={category.id} id={sectionId(category.id)} aria-labelledby={`${sectionId(category.id)}-h`} className="scroll-mt-16 pt-8">
                <h2 id={`${sectionId(category.id)}-h`} className="font-display text-title font-semibold">
                  {category.name}
                </h2>
                {category.tagline && <p className="text-sm font-semibold text-brass-ink">{category.tagline}</p>}
                {(meta || category.note) && <p className="mt-1 text-sm text-muted">{[meta, category.note].filter(Boolean).join(" · ")}</p>}
                <div className="hairline mt-3" />
                <ul className="mt-4 space-y-3">
                  {list.map((item) => {
                    const heading = item.group && item.group !== lastGroup ? item.group : null;
                    lastGroup = item.group;
                    return [
                      heading && (
                        <li key={`${item.id}-g`} className="pt-2 text-eyebrow font-semibold text-brass-ink uppercase">
                          {heading}
                        </li>
                      ),
                      <DishRow
                        key={item.id}
                        item={item}
                        qty={qtyByItem.get(item.id) ?? 0}
                        onOpen={openDish}
                        onAdd={quickAdd}
                        onDecrement={decrement}
                      />,
                    ];
                  })}
                </ul>
              </section>
            );
          })
        )}

        <footer className="mt-12 space-y-1 border-t border-sand pt-6 text-center text-sm text-muted">
          <p>{taxNote}</p>
          <p>{menu.meta.serviceNote}</p>
        </footer>
      </main>

      {/* Bottom bar: the order in progress, or the last order's status. */}
      {(count > 0 || order) && panel === null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {count > 0 ? (
            <button
              type="button"
              onClick={() => setPanel("cart")}
              className="pointer-events-auto mx-auto flex h-14 w-full max-w-xl items-center justify-between rounded-pill bg-bottle px-6 text-paper shadow-raised active:bg-bottle-deep"
            >
              <span className="tabular">
                {count} {count === 1 ? "item" : "items"} · <span className="font-semibold">{formatPrice(total)}</span>
              </span>
              <span className="font-semibold">View order</span>
            </button>
          ) : (
            order && (
              <button
                type="button"
                onClick={() => setPanel("order")}
                className="pointer-events-auto mx-auto flex h-14 w-full max-w-xl items-center justify-between rounded-pill border border-bottle bg-paper px-6 text-charcoal shadow-raised"
              >
                <span>
                  Order <span className="font-semibold tabular">{order.number}</span>
                </span>
                <span className="font-semibold text-bottle">{ORDER_STEPS[step].label}</span>
              </button>
            )
          )}
        </div>
      )}

      <Sheet open={panel === "dish"} onClose={() => setPanel(null)} labelledBy="dish-title">
        {dish && (
          <DishSheetBody
            key={dish.id}
            item={dish}
            category={categories.get(dish.category)}
            diet={diet}
            onAdd={addFromSheet}
            onClose={() => setPanel(null)}
          />
        )}
      </Sheet>

      <Sheet open={panel === "cart"} onClose={() => setPanel(null)} labelledBy="cart-title">
        <CartSheetBody
          lines={lines}
          items={items}
          table={table}
          tableFromQr={qrTable !== null}
          onTableChange={setTypedTable}
          onQty={(id, qty) => dispatch({ type: "qty", id, qty })}
          onNote={(id, note) => dispatch({ type: "note", id, note })}
          onPlace={submitOrder}
          placing={placing}
          taxNote={taxNote}
          onClose={() => setPanel(null)}
        />
      </Sheet>

      <Sheet open={panel === "order"} onClose={() => setPanel(null)} labelledBy="order-title">
        {order && <OrderViewBody order={order} onClose={() => setPanel(null)} />}
      </Sheet>
    </div>
  );
}
