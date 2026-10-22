"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BlockedGuests } from "@/components/blocked/blocked-guests";
import { RequireRole, signOut, useUser } from "@/components/app/auth";
import { Button } from "@/components/app/ui";
import { Logo } from "@/components/logo";
import { devicePrefs } from "@/lib/api";
import { Availability } from "./availability";
import { unlockSound } from "./chime";
import { OrderBoard } from "./order-board";
import { SuggestDish } from "./suggest";
import { TablesView } from "./tables-view";

const TABS = [
  { id: "orders", label: "Orders" },
  { id: "tables", label: "Tables" },
  { id: "menu", label: "Menu" },
  { id: "suggest", label: "Suggest a dish" },
  { id: "blocked", label: "Blocked guests" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** The tab lives in the URL hash (#tables), so a refresh keeps it. */
function useTab(): [Tab, (t: Tab) => void] {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab = (TABS.find((t) => t.id === hash)?.id ?? "orders") as Tab;
  const set = (t: Tab) => {
    window.location.hash = t === "orders" ? "" : t;
  };
  return [tab, set];
}

export function StaffApp() {
  return (
    <RequireRole roles={["staff"]}>
      <StaffScreen />
    </RequireRole>
  );
}

function StaffScreen() {
  const user = useUser();
  const [tab, setTab] = useTab();
  const [muted, setMutedState] = useState(() => devicePrefs.get("muted", false));
  const setMuted = (m: boolean) => {
    setMutedState(m);
    devicePrefs.set("muted", m);
  };
  const [fresh, setFresh] = useState<{ n: number; markSeen: () => void; tables: string }>({ n: 0, markSeen: () => {}, tables: "" });
  const onNewCount = useCallback((n: number, markSeen: () => void, tables: string) => setFresh({ n, markSeen, tables }), []);

  // Sound can only start after a tap on the page.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockSound, { once: true });
    return () => window.removeEventListener("pointerdown", unlockSound);
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-sand bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-gutter py-2">
          <Logo size={44} priority />
          <div className="mr-auto min-w-0">
            <p className="font-display text-lead leading-tight font-semibold">Staff screen</p>
            <p className="truncate text-sm text-muted">{user.name}</p>
          </div>
          {fresh.n > 0 && (
            <button
              type="button"
              onClick={() => {
                setTab("orders");
                fresh.markSeen();
              }}
              className="app-pulse h-11 rounded-pill border border-mustard bg-cream px-4 font-semibold text-charcoal"
              aria-label={`${fresh.n === 1 ? "New order" : `${fresh.n} new orders`} · Table ${fresh.tables}. Mark as seen`}
            >
              {fresh.n === 1 ? "New order" : <><span className="tabular">{fresh.n}</span> new</>} · Table <span className="tabular">{fresh.tables}</span>
            </button>
          )}
          <Button variant="ghost" onClick={() => setMuted(!muted)} aria-pressed={muted} className="border-sand!">
            {muted ? "Sound off" : "Sound on"}
          </Button>
          <Button variant="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
        <nav aria-label="Staff sections" className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-gutter">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
              className="min-h-12 shrink-0 border-b-[3px] border-transparent px-4 text-base font-semibold whitespace-nowrap text-muted focus-visible:outline-offset-[-4px] aria-[current]:border-bottle aria-[current]:text-bottle"
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-gutter py-5 focus:outline-none">
        <h1 className="sr-only">{TABS.find((t) => t.id === tab)!.label}</h1>
        {/* The board stays mounted, so new orders still chime on other tabs. */}
        <div hidden={tab !== "orders"}>
          <OrderBoard muted={muted} onNewCount={onNewCount} />
        </div>
        {tab === "tables" && <TablesView />}
        {tab === "menu" && <Availability />}
        {tab === "suggest" && <SuggestDish />}
        {tab === "blocked" && <BlockedGuests />}
      </main>
    </div>
  );
}
