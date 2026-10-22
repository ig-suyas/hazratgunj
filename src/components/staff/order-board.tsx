"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useEvent, useLive, useNow } from "@/components/app/hooks";
import { Button, ConfirmDialog, Dialog, Empty, ErrorState, Loading, Segmented, errorText, textareaClass, toast } from "@/components/app/ui";
import { clearTable, getLiveOrders, updateOrdersStatus, type LiveOrder, type Order } from "@/lib/api";
import { money } from "@/lib/fmt";
import { BlockDialog, type BlockTarget } from "./block-dialog";
import { chime } from "./chime";
import { OrderCard, TableBadge, type CardAction } from "./order-card";

const COLUMNS = [
  { key: "new", label: "New", match: (o: LiveOrder) => o.status === "received" },
  { key: "preparing", label: "Preparing", match: (o: LiveOrder) => o.status === "preparing" },
  { key: "served", label: "Served", match: (o: LiveOrder) => o.status === "served" || o.status === "declined" || o.status === "cancelled" },
] as const;
type Column = (typeof COLUMNS)[number]["key"];

const REJECT_REASONS = ["Out of stock", "Not seated at this table", "Kitchen closed", "Other"];

/** Orders of one column split by table, keeping the column order (first order of each table decides). */
function byTable(list: LiveOrder[]) {
  const groups = new Map<number, LiveOrder[]>();
  for (const o of list) groups.set(o.table, [...(groups.get(o.table) ?? []), o]);
  return [...groups.entries()].map(([table, orders]) => ({ table, orders }));
}

/**
 * Live board of the day's orders. New orders play a soft chime (unless muted)
 * and stay highlighted until someone acts on them or marks them seen.
 */
export function OrderBoard({ muted, onNewCount }: { muted: boolean; onNewCount: (n: number, markSeen: () => void, tables: string) => void }) {
  const live = useLive(getLiveOrders, "live", ["orders"]);
  const now = useNow(30_000);
  const [column, setColumn] = useState<Column>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [reject, setReject] = useState<Order[] | null>(null);
  const [clear, setClear] = useState<Order | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);

  // Highlight: received orders nobody has looked at yet. The first load counts as
  // unseen but silent; later arrivals chime.
  const known = useRef<Set<string> | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const orders = live.data ?? [];
  const unseen = orders.filter((o) => o.status === "received" && !seen.has(o.id));
  useEffect(() => {
    if (!live.data) return;
    const ids = live.data.filter((o) => o.status === "received").map((o) => o.id);
    if (known.current) {
      const arrived = live.data.filter((o) => o.status === "received" && !known.current!.has(o.id));
      if (arrived.length && !muted) chime();
      for (const o of arrived) toast(`New order · Table ${o.table}`);
    }
    known.current = new Set([...(known.current ?? []), ...ids]);
  }, [live.data, muted]);

  const markAllSeen = useEvent(() => setSeen(new Set([...seen, ...unseen.map((o) => o.id)])));
  const unseenCount = unseen.length;
  const unseenTables = [...new Set(unseen.map((o) => o.table))].sort((a, b) => a - b).join(", ");
  useEffect(() => {
    onNewCount(unseenCount, markAllSeen, unseenTables);
  }, [unseenCount, unseenTables, onNewCount, markAllSeen]);

  const act = (action: CardAction, order: LiveOrder) => {
    if (action === "clear") return setClear(order);
    if (action === "block") {
      setSeen((s) => new Set(s).add(order.id));
      return setBlock({ sessionId: order.sessionId, table: order.table, order });
    }
    return actAll(action, [order]);
  };

  /** One decision for whole orders: a single card, or every waiting order at one table. */
  const actAll = async (action: "accept" | "reject" | "serve", list: LiveOrder[]) => {
    setSeen((s) => new Set([...s, ...list.map((o) => o.id)]));
    if (action === "reject") return setReject(list);
    const table = list[0].table;
    setBusy(list.length === 1 ? list[0].id : `t${table}`);
    try {
      const done = await updateOrdersStatus(
        list.map((o) => o.id),
        action,
      );
      const what = done.length === 1 ? "order" : `${done.length} orders`;
      toast(action === "accept" ? `Table ${table}: ${what} accepted` : `Table ${table}: ${what} served`);
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  if (live.error && !live.data) return <ErrorState error={live.error} onRetry={live.reload} />;
  if (!live.data) return <Loading label="Loading orders" />;

  const byColumn = Object.fromEntries(COLUMNS.map((c) => [c.key, orders.filter(c.match)])) as Record<Column, LiveOrder[]>;
  // Newest first in Served; oldest first while waiting.
  byColumn.served = [...byColumn.served].reverse();

  return (
    <>
      <div className="mb-4 lg:hidden">
        <Segmented
          label="Order status"
          value={column}
          onChange={setColumn}
          options={COLUMNS.map((c) => ({ value: c.key, label: c.label, count: byColumn[c.key].length }))}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((c) => (
          <section key={c.key} aria-labelledby={`col-${c.key}`} className={column === c.key ? "" : "max-lg:hidden"}>
            <h2 id={`col-${c.key}`} className="mb-3 flex items-center justify-between max-lg:sr-only">
              <span className="text-lg font-semibold">{c.label}</span>
              <span className="rounded-pill bg-beige px-2.5 py-0.5 text-sm font-semibold tabular">{byColumn[c.key].length}</span>
            </h2>
            <div className="space-y-3">
              {byColumn[c.key].length === 0 ? (
                <Empty title={c.key === "new" ? "No new orders" : c.key === "preparing" ? "Nothing in preparation" : "Nothing served yet"}>
                  {c.key === "new" ? "New orders appear here with a soft sound." : null}
                </Empty>
              ) : (
                byTable(byColumn[c.key]).map(({ table, orders: list }) =>
                  c.key === "served" || list.length === 1 ? (
                    list.map((o) => <OrderCard key={o.id} order={o} now={now} isNew={o.status === "received" && !seen.has(o.id)} busy={busy === o.id} onAction={act} />)
                  ) : (
                    <TableGroup key={table} table={table} orders={list} busy={busy === `t${table}`} onAll={actAll}>
                      {list.map((o) => (
                        <OrderCard key={o.id} order={o} now={now} isNew={o.status === "received" && !seen.has(o.id)} busy={busy === o.id || busy === `t${table}`} onAction={act} />
                      ))}
                    </TableGroup>
                  ),
                )
              )}
            </div>
          </section>
        ))}
      </div>

      <RejectDialog orders={reject} onClose={() => setReject(null)} />
      <ConfirmDialog
        open={!!clear}
        onClose={() => setClear(null)}
        title={clear ? `Clear Table ${clear.table}?` : "Clear table"}
        description="This ends the guest session. To order again, guests scan the QR code at the table."
        confirmLabel="Clear table"
        onConfirm={async () => {
          if (!clear) return;
          await clearTable(clear.table);
          toast(`Table ${clear.table} cleared`);
        }}
      />
      <BlockDialog target={block} onClose={() => setBlock(null)} />
    </>
  );
}

/** Header over several waiting orders from one table, with one decision for all of them. */
function TableGroup({
  table,
  orders,
  busy,
  onAll,
  children,
}: {
  table: number;
  orders: LiveOrder[];
  busy: boolean;
  onAll: (action: "accept" | "reject" | "serve", list: LiveOrder[]) => void;
  children: ReactNode;
}) {
  const waiting = orders[0].status === "received";
  const total = orders.reduce((n, o) => n + o.total, 0);
  return (
    <section aria-label={`Table ${table}, ${orders.length} orders`} className="space-y-3 rounded-card border-2 border-charcoal/80 bg-cream p-3">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <TableBadge table={table} />
        <p className="text-right">
          <span className="block font-semibold tabular">{orders.length} orders</span>
          <span className="text-sm text-muted tabular">Combined {money(total)}</span>
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {waiting ? (
          <>
            <Button variant="primary" size="lg" className="flex-1" busy={busy} onClick={() => onAll("accept", orders)}>
              Accept all
            </Button>
            <Button variant="secondary" size="lg" className="flex-1" disabled={busy} onClick={() => onAll("reject", orders)}>
              Reject all
            </Button>
          </>
        ) : (
          <Button variant="primary" size="lg" className="flex-1" busy={busy} onClick={() => onAll("serve", orders)}>
            Mark all served
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function RejectDialog({ orders, onClose }: { orders: Order[] | null; onClose: () => void }) {
  const many = (orders?.length ?? 0) > 1;
  return (
    <Dialog
      open={!!orders}
      onClose={onClose}
      title={orders ? (many ? `Reject all ${orders.length} orders from Table ${orders[0].table}?` : `Reject the order from Table ${orders[0].table}?`) : "Reject order"}
    >
      {orders && <RejectForm key={orders.map((o) => o.id).join()} orders={orders} onClose={onClose} />}
    </Dialog>
  );
}

function RejectForm({ orders, onClose }: { orders: Order[]; onClose: () => void }) {
  const id = useId();
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const table = orders[0].table;
  const submit = async () => {
    const text = reason === "Other" ? note.trim() : reason;
    if (!text) return setError("Add a short reason.");
    setBusy(true);
    try {
      const done = await updateOrdersStatus(
        orders.map((o) => o.id),
        "reject",
        text,
      );
      toast(`Table ${table}: ${done.length === 1 ? "order" : `${done.length} orders`} rejected`);
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-muted">
        Every dish in {orders.length === 1 ? "this order" : "these orders"} is declined. The guest sees that the order could not be accepted and is asked to talk to staff.
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Reason</legend>
        {REJECT_REASONS.map((r) => (
          <label key={r} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-thumb border border-sand bg-paper px-3 has-checked:border-bottle has-checked:shadow-ring">
            <input type="radio" name={`${id}-r`} checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-bottle" />
            {r}
          </label>
        ))}
      </fieldset>
      {reason === "Other" && (
        <div>
          <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm font-semibold">
            Reason
          </label>
          <textarea id={`${id}-note`} rows={2} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" busy={busy} onClick={submit}>
          {orders.length === 1 ? "Reject order" : "Reject all"}
        </Button>
      </div>
    </div>
  );
}
