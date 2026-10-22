"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { devicePrefs, resetDemoData, setDemoSubscription, simulateOrder } from "@/lib/api";
import { Button, ConfirmDialog, toast } from "./ui";

const noop = () => () => {};

/** Shown in development, or after opening any staff page with ?demo=1 (remembered for the tab). */
function useDemoMode() {
  const inUrl = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("demo") === "1",
    () => false,
  );
  useEffect(() => {
    if (inUrl) devicePrefs.set("demo", true, true);
  }, [inUrl]);
  return process.env.NODE_ENV === "development" || inUrl || devicePrefs.get("demo", false, true);
}

/** Demo-only panel: reset the data, simulate orders, change the subscription state. */
export function DemoControls() {
  const on = useDemoMode();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!on) return null;

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast(done);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed bottom-24 left-3 z-50 lg:bottom-4 print:hidden">
      {open ? (
        <div role="dialog" aria-label="Demo controls" className="w-72 rounded-card border border-brass bg-paper p-4 shadow-raised">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-eyebrow font-semibold tracking-wide text-brass-ink uppercase">Demo controls</p>
            <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-sm font-semibold text-bottle">
              Close
            </button>
          </div>
          <div className="grid gap-2">
            <Button size="sm" busy={busy === "order"} onClick={() => run("order", () => simulateOrder("simulated"), "A new order arrived")}>
              Simulate a new order
            </Button>
            <Button size="sm" busy={busy === "home"} onClick={() => run("home", () => simulateOrder("from-home"), "An order arrived from an empty table")}>
              Simulate ordering from home
            </Button>
            <p className="mt-2 text-sm font-semibold">Subscription</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["active", "Active"],
                  ["due", "Due in 3 days"],
                  ["today", "Due today"],
                  ["expired", "Expired"],
                ] as const
              ).map(([mode, label]) => (
                <Button key={mode} size="sm" variant="ghost" className="border-sand!" busy={busy === mode} onClick={() => run(mode, () => setDemoSubscription(mode), `Subscription: ${label.toLowerCase()}`)}>
                  {label}
                </Button>
              ))}
            </div>
            <Button size="sm" variant="danger" className="mt-2" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 rounded-pill border border-brass bg-paper px-4 text-sm font-semibold text-brass-ink shadow-card"
        >
          Demo
        </button>
      )}
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset the demo data?"
        description="Orders, sessions, blocks, menu edits, staff, discounts and settings on this device go back to the starting demo. You stay signed in only if your account still exists."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={async () => {
          await resetDemoData();
          toast("Demo data reset");
        }}
      />
    </div>
  );
}
