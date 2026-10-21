"use client";

import { useSyncExternalStore } from "react";
import { DietMark } from "@/components/diet-mark";
import type { Order } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { CheckIcon, CloseIcon } from "./icons";

// SIMULATED STATUS. There is no kitchen system behind this demo: the order
// moves from Received to Preparing to Ready on fixed timers from the moment it
// was placed. Replace with status from the backend (polling or a live channel).
export const ORDER_STEPS = [
  { key: "received", label: "Received", after: 0 },
  { key: "preparing", label: "Preparing", after: 8_000 },
  { key: "ready", label: "Ready", after: 25_000 },
] as const;

// A one-second clock that only ticks while someone is subscribed (never
// during prerender, where the time would be meaningless).
let clock = 0;
let timer: number | undefined;
const ticks = new Set<() => void>();
function subscribeClock(cb: () => void) {
  ticks.add(cb);
  if (timer === undefined) {
    clock = Date.now();
    timer = window.setInterval(() => {
      clock = Date.now();
      ticks.forEach((t) => t());
    }, 1000);
  }
  return () => {
    ticks.delete(cb);
    if (ticks.size === 0) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}
const noSubscribe = () => () => {};

/** Index into ORDER_STEPS for the order, advancing on the simulated timers. */
export function useSimulatedStatus(order: Order | null) {
  const last = ORDER_STEPS.at(-1)!.after;
  const pending = !!order && (clock === 0 || clock - order.placedAt < last);
  const now = useSyncExternalStore(pending ? subscribeClock : noSubscribe, () => clock, () => 0);
  if (!order || now === 0) return 0;
  const elapsed = now - order.placedAt;
  return ORDER_STEPS.reduce((step, s, i) => (elapsed >= s.after ? i : step), 0);
}

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function OrderViewBody({ order, onClose }: { order: Order; onClose: () => void }) {
  const step = useSimulatedStatus(order);
  return (
    <>
      <div className="sheet-body">
        <div className="relative flex flex-col items-center gap-2 bg-beige px-6 pt-8 pb-6 text-center">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid size-11 place-items-center rounded-pill text-charcoal">
            <CloseIcon />
          </button>
          <span className="grid size-14 place-items-center rounded-pill bg-bottle text-paper shadow-card">
            <CheckIcon />
          </span>
          <h2 id="order-title" className="mt-2 font-display text-headline font-semibold">
            Order placed
          </h2>
          <p className="text-base">
            <span className="font-semibold tabular">{order.number}</span>
            <span className="text-muted"> · Table </span>
            <span className="font-semibold tabular">{order.table}</span>
            <span className="text-muted"> · {time(order.placedAt)}</span>
          </p>
        </div>

        <div className="space-y-6 px-5 py-6">
          <ol className="grid grid-cols-3 gap-2" aria-label="Order status">
            {ORDER_STEPS.map((s, i) => {
              const reached = i <= step;
              return (
                <li key={s.key} aria-current={i === step ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
                  <span className={`h-1.5 w-full rounded-pill ${reached ? "bg-bottle" : "bg-sand"}`} />
                  <span className={`text-sm ${reached ? "font-semibold text-charcoal" : "text-muted"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-center text-sm text-muted" aria-live="polite">
            {step === 0 && "The kitchen has your order."}
            {step === 1 && "Your food is being prepared."}
            {step === 2 && "Your order is ready and on its way to your table."}
          </p>

          <ul className="divide-y divide-sand border-y border-sand">
            {order.lines.map((l, i) => (
              <li key={i} className="flex gap-2.5 py-3">
                <DietMark veg={l.veg} className="mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold tabular">{l.qty} × </span>
                    {l.name}
                  </p>
                  {l.detail && <p className="text-sm text-muted">{l.detail}</p>}
                  {l.note && <p className="text-sm italic">“{l.note}”</p>}
                </div>
                <p className="tabular">{formatPrice(l.unitPrice * l.qty)}</p>
              </li>
            ))}
          </ul>
          <p className="flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span className="tabular">{formatPrice(order.subtotal)}</span>
          </p>
          <p className="rounded-thumb border border-dashed border-sand p-3 text-sm text-muted">
            This is a demo. No order was sent to the kitchen, and the status above is simulated.
          </p>
        </div>
      </div>
      <footer className="sheet-footer">
        <button type="button" onClick={onClose} className="h-12 w-full rounded-pill bg-bottle font-semibold text-paper shadow-card active:bg-bottle-deep">
          Back to the menu
        </button>
      </footer>
    </>
  );
}
