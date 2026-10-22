"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLive } from "@/components/app/hooks";
import { DietMark } from "@/components/diet-mark";
import { Logo } from "@/components/logo";
import { demo } from "@/config/demo";
import {
  ApiError,
  devicePrefs,
  getActiveDiscounts,
  getGuestOrders,
  getGuestState,
  getMenu,
  placeOrder,
  type LiveMenu,
  type MenuItem,
  type Order,
} from "@/lib/api";
import { cartReducer, unitPrice, type CartAction, type CartLine, type LineChoice } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { dayKey } from "@/lib/fmt";
import { filterMenu, searchIndex, type Diet } from "@/lib/menu-filter";
import { bestPrice } from "@/lib/pricing";
import { CartSheetBody } from "./cart-sheet";
import { ALL, CategoryNav, sectionId } from "./category-nav";
import { DishOrderSheetBody } from "./dish-order-sheet";
import { DishRow, type RowOrdering } from "./dish-row";
import { DishSheetBody } from "./dish-sheet";
import { useGuestOrdering, type GuestMode } from "./guest";
import { useEvent } from "./hooks";
import { CloseIcon, SearchIcon } from "./icons";
import { menuView } from "./menu-view";
import { OrderStatusBody, STATUS_LABEL } from "./order-status";
import { Sheet } from "./sheet";

// The menu. Read-only for everyone; guests who open it from their table's QR
// link (/menu?t=<token>) can also order (see guest.ts).

type Panel = "dish" | "cart" | "order" | null;
const NO_ORDERS: Order[] = [];

function orderError(e: unknown) {
  if (e instanceof ApiError) {
    if (e.code === "cooldown") return "Your last order was just sent. Please wait a few seconds and try again.";
    if (e.code === "rate_limited") return "You have placed several orders in the last hour. Please wait a little, or ask our staff to add to your order.";
    if (e.code === "unavailable") return "Ordering is unavailable right now. Please ask our staff to take your order.";
    if (e.code === "expired") return "Please rescan the QR code at your table.";
    if (e.message) return e.message;
  }
  return "Your order could not be sent. Please try again.";
}

const DIETS: { value: Diet; label: string }[] = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg" },
  { value: "nonveg", label: "Non-veg" },
];

export function MenuApp({ menu: initial, taxNote }: { menu: LiveMenu; taxNote: string }) {
  // The owner's edits and today's stock apply as soon as the page is live.
  const live = useLive(getMenu, "menu", ["menu"]);
  const data = live.data ?? initial;
  const menu = useMemo(() => menuView(data), [data]);
  const available = useMemo(() => new Map(data.items.map((i) => [i.id, i.available])), [data]);
  const storedCategory = useMemo(() => new Map(data.items.map((i) => [i.id, i.category])), [data]);
  const items = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu]);
  const categories = useMemo(() => new Map(menu.categories.map((c) => [c.id, c])), [menu]);
  const index = useMemo(() => searchIndex(menu), [menu]);

  // Filters
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const deferredQuery = useDeferredValue(query);
  const matching = useMemo(() => filterMenu(menu, index, deferredQuery, diet), [menu, index, deferredQuery, diet]);
  const counts = useMemo(() => {
    const m = new Map(matching.map((s) => [s.category.id, s.items.length]));
    m.set(ALL, matching.reduce((n, s) => n + s.items.length, 0));
    return m;
  }, [matching]);
  const [category, setCategory] = useState(ALL);
  const sections = category === ALL ? matching : matching.filter((s) => s.category.id === category);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLElement>(null);

  // A new category replaces the list in place. If the reader is already below
  // the top of the list, bring its top up under the sticky bar.
  const chooseCategory = (id: string) => {
    setCategory(id);
    const list = listRef.current;
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start" });
  };

  // Dish details. The id stays set while the sheet closes, so it can animate out.
  const [dishId, setDishId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const dish = dishId ? items.get(dishId) : undefined;
  const dishOpen = panel === "dish";
  const closePanel = () => setPanel(null);

  const openDish = useEvent((id: string) => {
    setDishId(id);
    setPanel("dish");
  });

  // Ordering: only with a valid table session from the QR link.
  const guest = useGuestOrdering();
  const sessionId = guest.kind === "active" ? guest.sessionId : null;
  const canOrder = guest.kind === "active";

  // Running discounts, priced on the dish's stored category (menu-view merges two).
  const disc = useLive(getActiveDiscounts, "discounts", ["discounts"]);
  const priceOf = useCallback(
    (item: MenuItem, unit: number) => {
      const list = disc.data ?? [];
      if (!list.length) return unit;
      return bestPrice(unit, item.id, storedCategory.get(item.id) ?? item.category, list, dayKey(Date.now())).unit;
    },
    [disc.data, storedCategory],
  );

  // Cart, kept per guest session for this tab.
  const [cart, setCart] = useState<{ sid: string | null; lines: CartLine[] }>({ sid: null, lines: [] });
  if (cart.sid !== sessionId) setCart({ sid: sessionId, lines: sessionId ? devicePrefs.get<CartLine[]>(`cart:${sessionId}`, [], true) : [] });
  useEffect(() => {
    if (cart.sid) devicePrefs.set(`cart:${cart.sid}`, cart.lines, true);
  }, [cart]);
  const dispatch = useCallback((action: CartAction) => setCart((c) => ({ ...c, lines: cartReducer(c.lines, action) })), []);
  const lines = useMemo(() => cart.lines.filter((l) => items.has(l.itemId)), [cart.lines, items]);
  const qtyByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty);
    return m;
  }, [lines]);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => {
    const item = items.get(l.itemId);
    return item ? s + priceOf(item, unitPrice(item, l.variantId, l.selection)) * l.qty : s;
  }, 0);

  const quickAdd = useEvent((item: MenuItem) =>
    dispatch({ type: "add", choice: { itemId: item.id, variantId: null, selection: {}, note: "" }, qty: 1 }),
  );
  const decrement = useEvent((item: MenuItem) => dispatch({ type: "decrementItem", itemId: item.id }));
  const addFromSheet = (choice: LineChoice, qty: number) => {
    dispatch({ type: "add", choice, qty });
    setPanel(null);
  };
  // One stable object per quantity, so memoised rows re-render only when theirs changes.
  const ordering = useMemo(() => {
    const m = new Map<string, RowOrdering>();
    if (!canOrder) return m;
    for (const item of menu.items) m.set(item.id, { qty: qtyByItem.get(item.id) ?? 0, onAdd: quickAdd, onDecrement: decrement });
    return m;
  }, [canOrder, menu.items, qtyByItem, quickAdd, decrement]);

  // Placing the order, and the guest's own orders with live status.
  const [typedTable, setTypedTable] = useState("");
  const table = demo.tableMode === "qr" ? (guest.kind === "active" ? String(guest.table) : null) : typedTable || null;
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const mine = useLive(() => (sessionId ? getGuestOrders(sessionId) : Promise.resolve(NO_ORDERS)), sessionId ?? "-", ["orders"]);
  const myOrders = (sessionId && mine.data) || NO_ORDERS;

  // A ref as well as state, so a fast double tap cannot send the order twice.
  const sending = useRef(false);
  const [cartKey, setCartKey] = useState(0);
  const checkSession = async () => {
    if (!sessionId) return false;
    setError(null);
    const s = await getGuestState(sessionId);
    if (s.kind === "active") return true;
    setError(s.kind === "unavailable" ? "Ordering is unavailable right now. Please ask our staff to take your order." : "Please rescan the QR code at your table.");
    return false;
  };

  const submit = async () => {
    if (!sessionId || sending.current || !table) return;
    sending.current = true;
    setPlacing(true);
    setError(null);
    try {
      const order = await placeOrder({
        sessionId,
        table: demo.tableMode === "ask" ? Number(table) : undefined,
        lines: lines.map(({ itemId, variantId, selection, note, qty }) => ({ itemId, variantId, selection, note, qty })),
      });
      dispatch({ type: "clear" });
      setJustPlaced(order.id);
      setPanel("order");
    } catch (e) {
      setError(orderError(e));
    } finally {
      sending.current = false;
      setPlacing(false);
    }
  };

  const empty = sections.length === 0;

  return (
    <div className={`menu-root min-h-dvh bg-cream ${canOrder ? "pb-32" : "pb-12"}`}>
      <header className="mx-auto max-w-2xl px-gutter pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} aria-label="Hazratgunj home" className="block py-1">
            <Logo size={64} priority alt="Hazratgunj Restaurant and Banquet, home" />
          </Link>
          {guest.kind === "active" && demo.tableMode === "qr" && (
            <span className="rounded-pill border border-brass px-3.5 py-1.5 text-sm font-semibold text-brass-ink tabular">Table {guest.table}</span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <h1 className="font-display text-headline font-medium">Menu</h1>
          <p className="pb-2 text-right text-sm text-muted">Prices in ₹, taxes extra</p>
        </div>
        <div className="hairline mt-2" />
        <GuestNotice kind={guest.kind} />

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

      <div className="h-4" />
      <CategoryNav categories={menu.categories} counts={counts} value={category} onChange={chooseCategory} searchRef={searchRef} />

      {/* min-h keeps the list's top reachable when a short category is picked. */}
      <main ref={listRef} className="mx-auto min-h-dvh max-w-2xl scroll-mt-16 px-gutter">
        {empty ? (
          <div className="py-16 text-center">
            <p className="text-lg">No dishes found.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDiet("all");
                setCategory(ALL);
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
                  {/* Same plain label as the category dropdown (the printed section
                      titles, e.g. "Tandoor Se", stay in menu.json). */}
                  {category.tab}
                </h2>
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
                        onOpen={openDish}
                        available={available.get(item.id) ?? true}
                        discounted={discountedBase(item, priceOf)}
                        ordering={ordering.get(item.id) ?? null}
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

      {/* Bottom bar: the order in progress, or the latest order's status. */}
      {canOrder && (count > 0 || myOrders.length > 0) && panel === null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {count > 0 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCartKey((k) => k + 1);
                setPanel("cart");
              }}
              className="pointer-events-auto mx-auto flex h-14 w-full max-w-xl items-center justify-between rounded-pill bg-bottle px-6 text-paper shadow-raised active:bg-bottle-deep"
            >
              <span className="tabular">
                {count} {count === 1 ? "item" : "items"} · <span className="font-semibold">{formatPrice(total)}</span>
              </span>
              <span className="font-semibold">View order</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setJustPlaced(null);
                setPanel("order");
              }}
              className="pointer-events-auto mx-auto flex h-14 w-full max-w-xl items-center justify-between rounded-pill border border-bottle bg-paper px-6 text-charcoal shadow-raised"
            >
              <span>
                Order <span className="font-semibold tabular">{myOrders[0].id}</span>
              </span>
              <span className="font-semibold text-bottle">{STATUS_LABEL[myOrders[0].status]}</span>
            </button>
          )}
        </div>
      )}

      <Sheet open={dishOpen} onClose={closePanel} labelledBy="dish-title">
        {dish &&
          (canOrder && (available.get(dish.id) ?? true) ? (
            <DishOrderSheetBody
              key={dish.id}
              item={dish}
              category={categories.get(dish.category)}
              diet={diet}
              priceOf={priceOf}
              onAdd={addFromSheet}
              onClose={closePanel}
            />
          ) : (
            <DishSheetBody key={dish.id} item={dish} category={categories.get(dish.category)} onClose={closePanel} />
          ))}
      </Sheet>

      {canOrder && (
        <>
          <Sheet open={panel === "cart"} onClose={closePanel} labelledBy="cart-title">
            <CartSheetBody
              key={cartKey}
              lines={lines}
              items={items}
              isAvailable={(id) => available.get(id) ?? true}
              priceOf={priceOf}
              table={table}
              tableFromQr={demo.tableMode === "qr"}
              onTableChange={setTypedTable}
              onQty={(id, qty) => dispatch({ type: "qty", id, qty })}
              onNote={(id, note) => dispatch({ type: "note", id, note })}
              onReview={checkSession}
              onPlace={submit}
              placing={placing}
              error={error}
              taxNote={taxNote}
              onClose={closePanel}
            />
          </Sheet>
          <Sheet open={panel === "order"} onClose={closePanel} labelledBy="order-title">
            {myOrders.length > 0 && <OrderStatusBody orders={myOrders} justPlaced={justPlaced} onClose={closePanel} />}
          </Sheet>
        </>
      )}
    </div>
  );
}

/** The dish's lowest price after a running discount, or null when none applies. */
function discountedBase(item: MenuItem, priceOf: (item: MenuItem, unit: number) => number) {
  if (item.price === null) return null;
  const unit = priceOf(item, item.price);
  return unit < item.price ? unit : null;
}

/** Quiet line under the heading: how to order, or why ordering is off. */
function GuestNotice({ kind }: { kind: GuestMode["kind"] }) {
  const TEXT: Partial<Record<GuestMode["kind"], string>> = {
    loading: "Opening your table…",
    readonly: "Scan the QR code at your table to order.",
    rescan: "Please rescan the QR code at your table.",
    unavailable: "Ordering is unavailable right now. Please ask our staff to take your order.",
  };
  const text = TEXT[kind];
  if (!text) return null;
  return (
    <p
      role={kind === "readonly" ? undefined : "status"}
      className={`mt-3 text-sm ${kind === "readonly" || kind === "loading" ? "text-muted" : "rounded-thumb bg-beige/70 px-3 py-2.5 text-charcoal"}`}
    >
      {text}
    </p>
  );
}
