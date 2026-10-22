"use client";

import { DietMark } from "@/components/diet-mark";
import type { Order, OrderStatus } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { formatTime } from "@/lib/fmt";
import { CheckIcon, CloseIcon } from "./icons";

const STEPS = [
  { key: "received", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "served", label: "Served" },
] as const;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  served: "Served",
  declined: "Declined",
  cancelled: "Cancelled",
};

function Tracker({ status }: { status: OrderStatus }) {
  if (status === "declined" || status === "cancelled") {
    return <p className="rounded-thumb bg-beige/70 px-3 py-2.5 text-sm">This order could not be accepted. Please ask our staff for help.</p>;
  }
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Order status">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s.key} aria-current={i === at ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
            <span className={`h-1.5 w-full rounded-pill ${done ? "bg-bottle" : "bg-sand"}`} />
            <span className={`text-sm ${i === at ? "font-semibold text-bottle" : done ? "text-charcoal" : "text-muted"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The guest's own orders this visit, with live status from the staff screen. */
export function OrderStatusBody({ orders, justPlaced, onClose }: { orders: Order[]; justPlaced: string | null; onClose: () => void }) {
  const latest = orders[0];
  return (
    <>
      <div className="sheet-body">
        <div className="relative flex flex-col items-center gap-2 bg-beige px-6 pt-8 pb-6 text-center">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid size-11 place-items-center rounded-pill text-charcoal">
            <CloseIcon />
          </button>
          {justPlaced && latest?.id === justPlaced ? (
            <>
              <span className="grid size-14 place-items-center rounded-pill bg-bottle text-paper shadow-card">
                <CheckIcon />
              </span>
              <h2 id="order-title" className="mt-2 font-display text-headline font-semibold">
                Order placed
              </h2>
              <p className="text-base text-muted">We have sent it to the kitchen. You can follow it here.</p>
            </>
          ) : (
            <h2 id="order-title" className="font-display text-headline font-semibold">
              Your orders
            </h2>
          )}
        </div>

        <ul className="space-y-6 px-5 py-6">
          {orders.map((o) => (
            <li key={o.id} className="space-y-3 border-b border-sand pb-6 last:border-0 last:pb-0">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-semibold tabular">{o.id}</span>
                  <span className="text-muted"> · Table </span>
                  <span className="font-semibold tabular">{o.table}</span>
                  <span className="text-muted tabular"> · {formatTime(o.placedAt)}</span>
                </span>
                <span className="font-semibold text-bottle">{STATUS_LABEL[o.status]}</span>
              </p>
              <Tracker status={o.status} />
              <ul className="space-y-1.5">
                {o.lines.map((l, i) => (
                  <li key={i} className="flex gap-2.5 text-base">
                    <DietMark veg={l.veg} className="mt-1 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="tabular">{l.qty} × </span>
                      {l.name}
                      {l.detail && <span className="text-muted"> · {l.detail}</span>}
                      {l.note && <span className="block text-sm text-muted italic">“{l.note}”</span>}
                    </span>
                    <span className="tabular">{formatPrice(l.unitPrice * l.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.discount > 0 && (
                <p className="flex justify-between text-sm text-bottle">
                  <span>Discount</span>
                  <span className="tabular">−{formatPrice(o.discount)}</span>
                </p>
              )}
              <p className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular">{formatPrice(o.total)}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
      <footer className="sheet-footer">
        <button type="button" onClick={onClose} className="h-12 w-full rounded-pill border border-bottle bg-paper font-semibold text-bottle">
          Back to the menu
        </button>
      </footer>
    </>
  );
}
