"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { Category } from "@/lib/data";
import { SearchIcon } from "./icons";
import { usePrefersReducedMotion } from "./hooks";

export const sectionId = (categoryId: string) => `c-${categoryId}`;

export const ALL = "all";

/**
 * Sticky bar with a category dropdown. Picking a category filters the list
 * (menu-app.tsx); "All" shows every section. The panel closes on selection,
 * Escape or a tap outside.
 */
export function CategoryNav({
  categories,
  counts,
  value,
  onChange,
  searchRef,
}: {
  categories: Category[];
  /** Dishes per category under the current search and diet filter; ALL = total. */
  counts: Map<string, number>;
  value: string;
  onChange: (categoryId: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const reduced = usePrefersReducedMotion();
  const current = categories.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>("[aria-current='true']")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (id: string) => {
    setOpen(false);
    buttonRef.current?.focus();
    onChange(id);
  };

  const options = [{ id: ALL, label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.tab }))];

  return (
    <nav aria-label="Menu categories" className="sticky top-0 z-20 border-b border-sand bg-cream/95 backdrop-blur-sm">
      <div ref={rootRef} className="relative mx-auto flex max-w-2xl items-center gap-2 py-2 pr-gutter">
        <button
          type="button"
          aria-label="Search the menu"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
            searchRef.current?.focus({ preventScroll: true });
          }}
          className="grid size-tap shrink-0 place-items-center text-muted"
        >
          <SearchIcon />
        </button>

        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 flex-1 items-center justify-between gap-3 rounded-pill border border-bottle bg-paper px-4 text-left font-semibold text-bottle"
        >
          <span>
            <span className="sr-only">Category: </span>
            {current?.tab ?? "All"}
          </span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-4 transition-transform duration-(--dur-ui) ${open ? "rotate-180" : ""}`}>
            <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul
            id={listId}
            aria-label="Categories"
            className="absolute inset-x-gutter top-full z-30 mt-1 max-h-[min(60dvh,28rem)] overflow-y-auto rounded-card border border-sand bg-paper py-1 shadow-raised"
          >
            {options.map((o) => {
              const count = counts.get(o.id) ?? 0;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-current={o.id === value ? "true" : undefined}
                    onClick={() => choose(o.id)}
                    className="flex min-h-tap w-full items-center justify-between gap-3 px-4 text-left text-base aria-[current]:font-semibold aria-[current]:text-bottle aria-[current]:bg-beige/60"
                  >
                    <span>{o.label}</span>
                    <span className={`text-sm tabular ${count ? "text-muted" : "text-muted/60"}`}>{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
