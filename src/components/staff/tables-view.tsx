"use client";

import { useState } from "react";
import { useLive, useNow } from "@/components/app/hooks";
import { Badge, Button, ConfirmDialog, ErrorState, Loading, toast } from "@/components/app/ui";
import { demo } from "@/config/demo";
import { clearTable, endSession, listActiveSessions, type TableSession } from "@/lib/api";
import { formatDuration, formatTime, money } from "@/lib/fmt";
import { BlockDialog, type BlockTarget } from "./block-dialog";

/** Every table, with the guest sessions open at it. */
export function TablesView() {
  const live = useLive(listActiveSessions, "sessions", ["sessions", "orders", "blocks"]);
  const now = useNow(30_000);
  const [clear, setClear] = useState<number | null>(null);
  const [end, setEnd] = useState<TableSession | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);

  if (live.error && !live.data) return <ErrorState error={live.error} onRetry={live.reload} />;
  if (!live.data) return <Loading label="Loading tables" />;

  const byTable = new Map<number, TableSession[]>();
  for (const s of live.data) byTable.set(s.table, [...(byTable.get(s.table) ?? []), s]);
  const clearing = clear !== null ? byTable.get(clear) ?? [] : [];
  const openOrders = clearing.flatMap((s) => s.orders).filter((o) => o.status === "received" || o.status === "preparing").length;

  return (
    <>
      <p className="mb-4 text-sm text-muted">A table is seated while a guest phone has an open session (it ends {demo.sessionMinutes} minutes after the last order, or when you clear the table).</p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: demo.tableCount }, (_, i) => i + 1).map((n) => {
          const list = byTable.get(n) ?? [];
          return (
            <li key={n} className={`rounded-card border bg-paper p-4 ${list.length ? "border-bottle" : "border-sand"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-muted">Table</span>
                  <span className="font-display text-[2.25rem] leading-none font-semibold tabular">{n}</span>
                </p>
                {list.length ? <Badge tone="green">Seated</Badge> : <Badge tone="muted">Free</Badge>}
              </div>
              {list.length > 0 && (
                <>
                  <ul className="mt-3 space-y-3">
                    {list.map((s, i) => (
                      <li key={s.id} className="rounded-thumb bg-cream px-3 py-2.5">
                        <p className="flex flex-wrap justify-between gap-x-3 text-base">
                          <span className="font-semibold">{list.length > 1 ? `Phone ${i + 1}` : "Guest phone"}</span>
                          <span className="tabular">
                            {s.orders.length} {s.orders.length === 1 ? "order" : "orders"} · {money(s.total)}
                          </span>
                        </p>
                        <p className="text-sm text-muted tabular">
                          Opened {formatTime(s.startedAt)} · ends in {formatDuration(s.expiresAt - now)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {list.length > 1 && (
                            <Button size="sm" onClick={() => setEnd(s)}>
                              End this session
                            </Button>
                          )}
                          <Button size="sm" variant="danger" onClick={() => setBlock({ sessionId: s.id, table: s.table, order: s.orders.at(-1) ?? null })}>
                            Block
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-3 w-full" size="lg" onClick={() => setClear(n)}>
                    Clear table
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={clear !== null}
        onClose={() => setClear(null)}
        title={`Clear table ${clear ?? ""}?`}
        description={
          <>
            This ends every guest session at the table. To order again, guests scan the QR code.
            {openOrders > 0 && ` ${openOrders} ${openOrders === 1 ? "order is" : "orders are"} still open and stay on the board.`}
          </>
        }
        confirmLabel="Clear table"
        onConfirm={async () => {
          if (clear === null) return;
          await clearTable(clear);
          toast(`Table ${clear} cleared`);
        }}
      />
      <ConfirmDialog
        open={!!end}
        onClose={() => setEnd(null)}
        title="End this guest session?"
        description="That phone has to scan the QR code again to order."
        confirmLabel="End session"
        onConfirm={async () => {
          if (!end) return;
          await endSession(end.id);
          toast(`Session at table ${end.table} ended`);
        }}
      />
      <BlockDialog target={block} onClose={() => setBlock(null)} />
    </>
  );
}
