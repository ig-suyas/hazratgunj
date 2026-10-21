"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import { Logo } from "@/components/logo";
import type { Menu } from "@/lib/data";
import { filterMenu, searchIndex, type Diet } from "@/lib/menu-filter";
import { ALL, CategoryNav, sectionId } from "./category-nav";
import { DishRow } from "./dish-row";
import { DishSheetBody } from "./dish-sheet";
import { useEvent } from "./hooks";
import { CloseIcon, SearchIcon } from "./icons";
import { menuView } from "./menu-view";
import { Sheet } from "./sheet";

// Read-only menu. The ordering version (cart, table, order status) is in
// parked/ordering/.

const DIETS: { value: Diet; label: string }[] = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg" },
  { value: "nonveg", label: "Non-veg" },
];

export function MenuApp({ menu: data, taxNote }: { menu: Menu; taxNote: string }) {
  const menu = useMemo(() => menuView(data), [data]);
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
  const [dishOpen, setDishOpen] = useState(false);
  const dish = dishId ? items.get(dishId) : undefined;

  const openDish = useEvent((id: string) => {
    setDishId(id);
    setDishOpen(true);
  });

  const empty = sections.length === 0;

  return (
    <div className="menu-root min-h-dvh bg-cream pb-12">
      <header className="mx-auto max-w-2xl px-gutter pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} aria-label="Hazratgunj home" className="block py-1">
            <Logo size={64} priority alt="Hazratgunj Restaurant and Banquet, home" />
          </Link>
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
                      <DishRow key={item.id} item={item} onOpen={openDish} />,
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

      <Sheet open={dishOpen} onClose={() => setDishOpen(false)} labelledBy="dish-title">
        {dish && (
          <DishSheetBody key={dish.id} item={dish} category={categories.get(dish.category)} onClose={() => setDishOpen(false)} />
        )}
      </Sheet>
    </div>
  );
}
