"use client";

import { useState } from "react";
import { DietMark } from "@/components/diet-mark";
import { Badge, Dialog, Empty } from "@/components/app/ui";
import { orderSummary, type Order, type OrderStatus } from "@/lib/api";
import { formatDateTime, formatTime, money } from "@/lib/fmt";

export const STATUS_BADGE: Record<OrderStatus, { tone: "brass" | "green" | "brown" | "muted" | "neutral"; label: string }> = {
  received: { tone: "brass", label: "New" },
  preparing: { tone: "neutral", label: "Preparing" },
  served: { tone: "green", label: "Served" },
  declined: { tone: "brown", label: "Declined" },
  cancelled: { tone: "muted", label: "Cancelled" },
};

export function StatusBadge({ order }: { order: Order }) {
  const b = STATUS_BADGE[order.status];
  return <Badge tone={b.tone}>{order.blockedGuest ? "Declined · blocked guest" : b.label}</Badge>;
}

/** Orders as rows; a tap opens the full order. */
export function OrderList({ orders, empty, showDate = false }: { orders: Order[]; empty: string; showDate?: boolean }) {
  const [open, setOpen] = useState<Order | null>(null);
  if (orders.length === 0) return <Empty title={empty} />;
  return (
    <>
      <ul className="divide-y divide-sand">
        {orders.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => setOpen(o)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-1 py-3 text-left hover:bg-cream sm:grid-cols-[8.5rem_5.5rem_minmax(0,1fr)_auto_6rem]"
            >
              <span className="text-sm text-muted tabular">{showDate ? formatDateTime(o.placedAt) : formatTime(o.placedAt)}</span>
              <span className="text-right font-semibold tabular sm:order-last">{money(o.total)}</span>
              <span className="font-semibold tabular">Table {o.table}</span>
              <span className="col-span-2 truncate text-sm sm:col-span-1 sm:text-base">
                <span className="text-muted tabular">{o.id} · </span>
                {orderSummary(o)}
              </span>
              <span className="col-span-2 sm:col-span-1">
                <StatusBadge order={o} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open ? `Order ${open.id}` : "Order"} wide>
        {open && <OrderDetail order={open} />}
      </Dialog>
    </>
  );
}

function OrderDetail({ order: o }: { order: Order }) {
  const steps: [string, number | undefined][] = [
    ["Placed", o.placedAt],
    ["Accepted", o.acceptedAt],
    ["Served", o.servedAt],
    [o.status === "cancelled" ? "Cancelled" : "Declined", o.declinedAt],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-semibold">Table {o.table}</span>
        <StatusBadge order={o} />
        {!o.live && <span className="text-sm text-muted">Demo history</span>}
      </div>
      <ul className="space-y-2">
        {o.lines.map((l, i) => (
          <li key={i} className="flex gap-2.5">
            <DietMark veg={l.veg} className="mt-1 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="tabular">{l.qty} × </span>
              {l.name}
              {l.detail && <span className="text-muted"> · {l.detail}</span>}
              {l.note && <span className="block text-sm text-brass-ink">Note: {l.note}</span>}
            </span>
            <span className="text-right tabular">
              {l.unitPrice < l.listPrice && <s className="block text-sm text-muted">{money(l.listPrice * l.qty)}</s>}
              {money(l.unitPrice * l.qty)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1 border-t border-sand pt-3">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular">{money(o.subtotal)}</dd>
        </div>
        {o.discount > 0 && (
          <div className="flex justify-between text-bottle">
            <dt>Discount</dt>
            <dd className="tabular">−{money(o.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular">{money(o.total)}</dd>
        </div>
      </dl>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-card bg-cream px-4 py-3 text-sm">
        {steps
          .filter(([, at]) => at)
          .map(([label, at]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="tabular">{formatDateTime(at!)}</dd>
            </div>
          ))}
        {o.reason && (
          <>
            <dt className="text-muted">Reason</dt>
            <dd>{o.reason}</dd>
          </>
        )}
        {o.handledBy && (
          <>
            <dt className="text-muted">Handled by</dt>
            <dd>{o.handledBy}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
