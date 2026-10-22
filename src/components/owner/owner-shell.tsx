"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RequireRole, signOut, useUser } from "@/components/app/auth";
import { useLive, useNow } from "@/components/app/hooks";
import { Button, Dialog } from "@/components/app/ui";
import { Logo } from "@/components/logo";
import { basePath } from "@/config/demo";
import { devicePrefs, getSubscription, listSuggestions } from "@/lib/api";
import { dayKey } from "@/lib/fmt";
import { NAV_ICONS } from "./nav-icons";

const root = `${basePath}/owner`;

export const OWNER_NAV = [
  { href: root, label: "Overview", icon: "overview" },
  { href: `${root}/orders`, label: "Orders", icon: "orders" },
  { href: `${root}/menu`, label: "Menu", icon: "menu" },
  { href: `${root}/approvals`, label: "Approvals", icon: "approvals" },
  { href: `${root}/discounts`, label: "Discounts", icon: "discounts" },
  { href: `${root}/staff`, label: "Staff", icon: "staff" },
  { href: `${root}/blocked`, label: "Blocked guests", icon: "blocked" },
  { href: `${root}/tables`, label: "Tables and QR", icon: "tables" },
  { href: `${root}/reports`, label: "Reports", icon: "reports" },
] as const;

/** On phones the tab bar holds four pages; the rest sit under "More". */
const TAB_BAR = new Set<string>([root, `${root}/orders`, `${root}/menu`, `${root}/reports`]);

export function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={["owner"]}>
      <Shell>{children}</Shell>
    </RequireRole>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const user = useUser();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const pending = useLive(listSuggestions, "suggestions", ["suggestions"]);
  const pendingCount = pending.data?.filter((s) => s.status === "pending").length ?? 0;
  const current = (href: string) => (href === root ? path === root : path.startsWith(href));

  const link = (item: (typeof OWNER_NAV)[number], compact = false) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={current(item.href) ? "page" : undefined}
      onClick={() => setMore(false)}
      className={
        compact
          ? "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-micro font-semibold text-muted aria-[current]:text-bottle"
          : "flex min-h-11 items-center gap-3 rounded-thumb px-3 font-semibold text-muted hover:bg-beige/50 aria-[current]:bg-beige aria-[current]:text-bottle"
      }
    >
      {NAV_ICONS[item.icon]}
      <span className={compact ? "truncate" : "flex-1"}>{compact && item.label === "Overview" ? "Today" : item.label}</span>
      {!compact && item.icon === "approvals" && pendingCount > 0 && (
        <span className="rounded-pill bg-mustard/40 px-2 text-sm text-charcoal tabular">{pendingCount}</span>
      )}
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sand bg-paper px-3 py-4 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <Logo size={48} priority />
          <div>
            <p className="font-display text-lead leading-tight font-semibold">Hazratgunj</p>
            <p className="text-sm text-muted">Owner</p>
          </div>
        </div>
        <div className="hairline mx-2 my-4" />
        <nav aria-label="Owner" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {OWNER_NAV.map((i) => link(i))}
        </nav>
        <div className="mt-3 border-t border-sand px-2 pt-3 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-muted">{user.username}</p>
          <div className="mt-2 flex flex-wrap gap-x-3">
            <Link href={`${basePath}/staff`} className="inline-flex min-h-9 items-center font-semibold text-bottle">
              Staff screen
            </Link>
            <button type="button" onClick={() => signOut()} className="min-h-9 font-semibold text-bottle">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        {/* Top bar (phones and tablets) */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sand bg-paper/95 px-gutter py-2 backdrop-blur-sm lg:hidden">
          <Logo size={40} priority />
          <p className="mr-auto font-display text-lead font-semibold">Owner</p>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </header>
        <RenewalBanner />
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-gutter py-6 focus:outline-none">
          {children}
        </main>
      </div>

      {/* Tab bar (phones and tablets) */}
      <nav aria-label="Owner" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sand bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
        {OWNER_NAV.filter((i) => TAB_BAR.has(i.href)).map((i) => link(i, true))}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-current={OWNER_NAV.some((i) => !TAB_BAR.has(i.href) && current(i.href)) ? "page" : undefined}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-micro font-semibold text-muted aria-[current]:text-bottle"
        >
          {NAV_ICONS.more}
          More{pendingCount > 0 && <span className="sr-only">, {pendingCount} pending approvals</span>}
        </button>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} title="More">
        <nav aria-label="More pages" className="flex flex-col gap-0.5">
          {OWNER_NAV.filter((i) => !TAB_BAR.has(i.href)).map((i) => link(i))}
          <Link href={`${basePath}/staff`} className="flex min-h-11 items-center gap-3 rounded-thumb px-3 font-semibold text-muted">
            {NAV_ICONS.orders}
            Staff screen
          </Link>
        </nav>
      </Dialog>
    </div>
  );
}

/** Owner-only reminder near the end of the demo subscription. Dismissed for the day. */
function RenewalBanner() {
  const sub = useLive(getSubscription, "sub", ["settings"]);
  const today = dayKey(useNow(60_000));
  const [dismissed, setDismissed] = useState(() => devicePrefs.get<string | null>("renewal-dismissed", null));
  const s = sub.data;
  if (!s || s.status === "active" || dismissed === today) return null;
  const text =
    s.status === "expired"
      ? "Renewal overdue. Guest ordering is paused until the subscription is renewed."
      : s.status === "today"
        ? "Renewal due today"
        : `Renewal due in ${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"}`;
  return (
    <div role="status" className="border-b border-brass bg-cream">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-gutter py-2.5">
        <span aria-hidden="true" className="h-6 w-1 rounded-pill bg-brass" />
        <p className="flex-1 font-semibold">{text}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            devicePrefs.set("renewal-dismissed", today);
            setDismissed(today);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
