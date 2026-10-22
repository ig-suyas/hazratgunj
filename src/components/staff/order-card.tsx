"use client";

import { DietMark } from "@/components/diet-mark";
import { Badge, Button } from "@/components/app/ui";
import type { LiveOrder } from "@/lib/api";
import { formatTime, money, timeAgo } from "@/lib/fmt";

export type CardAction = "accept" | "reject" | "serve" | "clear" | "block";

/** The table number as staff read it from across the room. */
export function TableBadge({ table, className = "" }: { table: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 rounded-thumb bg-charcoal px-3.5 py-1.5 font-display leading-none font-semibold text-paper ${className}`}>
      <span className="text-lg">Table</span>
      <span className="text-[2.25rem] tabular">{table}</span>
    </span>
  );
}

/**
 * One order on the staff board: big table number, session context, read-only
 * dishes, guest notes highlighted, total and one decision for the whole order.
 */
export function OrderCard({
  order,
  now,
  isNew,
  busy,
  onAction,
}: {
  order: LiveOrder;
  now: number;
  isNew: boolean;
  busy: boolean;
  onAction: (action: CardAction, order: LiveOrder) => void;
}) {
  const notes = order.lines.filter((l) => l.note);
  const done = order.status === "served" || order.status === "declined" || order.status === "cancelled";
  return (
    <article
      aria-label={`Table ${order.table}, order ${order.id}`}
      className={`rounded-card border bg-paper p-4 ${isNew ? "app-new border-mustard" : "border-sand"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <TableBadge table={order.table} />
        <div className="text-right">
          {isNew && <Badge tone="brass">New</Badge>}
          {order.status === "declined" && <Badge tone="brown">{order.blockedGuest ? "Declined · blocked" : "Declined"}</Badge>}
          {order.status === "served" && <Badge tone="green">Served</Badge>}
          <p className="mt-1 text-base font-semibold tabular">{formatTime(order.placedAt)}</p>
          <p className="text-sm text-muted">{timeAgo(order.placedAt, now)}</p>
        </div>
      </header>

      <p className="mt-2 text-sm text-muted tabular">{order.id}</p>
      <ul aria-label="Guest session" className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <li>{order.sessionStartedAt ? `Session started ${timeAgo(order.sessionStartedAt, now)}` : "Session unknown"}</li>
        <li>Order {order.sessionOrderNo} of this session</li>
      </ul>
      {order.status === "received" && <p className="mt-1 text-sm text-muted">Check Table {order.table} before accepting.</p>}

      <ul aria-label="Dishes" className="mt-3 space-y-1.5 text-lg">
        {order.lines.map((l, i) => (
          <li key={i} className="flex gap-2.5">
            <DietMark veg={l.veg} size={18} className="mt-1.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="font-semibold tabular">{l.qty} ×</span> {l.name}
              {l.detail && <span className="block text-base text-muted">{l.detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      {notes.length > 0 && (
        <div className="mt-3 rounded-thumb border-l-4 border-mustard bg-cream px-3 py-2.5">
          <p className="text-eyebrow font-semibold tracking-wide text-brass-ink uppercase">Guest notes</p>
          <ul className="mt-1 space-y-1 text-base">
            {notes.map((l, i) => (
              <li key={i}>
                <span className="font-semibold">{l.name}:</span> {l.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.reason && order.status !== "served" && <p className="mt-3 text-sm text-muted">Reason: {order.reason}</p>}

      <p className="mt-3 flex items-baseline justify-between border-t border-sand pt-3">
        <span className="text-sm text-muted">{order.discount > 0 ? `Total after ${money(order.discount)} discount` : "Total"}</span>
        <span className="text-xl font-semibold tabular">{money(order.total)}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "received" && (
          <>
            <Button variant="primary" size="lg" className="flex-1" busy={busy} onClick={() => onAction("accept", order)} aria-label={`Accept the whole order from table ${order.table}`}>
              Accept
            </Button>
            <Button variant="secondary" size="lg" disabled={busy} onClick={() => onAction("reject", order)} aria-label={`Reject the whole order from table ${order.table}`}>
              Reject
            </Button>
          </>
        )}
        {order.status === "preparing" && (
          <Button variant="primary" size="lg" className="flex-1" busy={busy} onClick={() => onAction("serve", order)}>
            Mark served
          </Button>
        )}
        {done && (
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => onAction("clear", order)}>
            Clear table
          </Button>
        )}
        <Button variant="danger" size="lg" disabled={busy} onClick={() => onAction("block", order)} aria-label={`Block the guest at table ${order.table}`}>
          Block
        </Button>
      </div>
    </article>
  );
}
