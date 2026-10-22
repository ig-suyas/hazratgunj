"use client";

import { useDeferredValue, useId, useState } from "react";
import { useLive, useNow } from "@/components/app/hooks";
import { Badge, Button, Dialog, Empty, ErrorState, Loading, Segmented, errorText, inputClass, textareaClass, toast } from "@/components/app/ui";
import {
  BLOCK_DURATIONS,
  BLOCK_REASONS,
  getBlockLog,
  listBlockedGuests,
  unblockGuest,
  type BlockRow,
  type BlockStatus,
} from "@/lib/api";
import { demo } from "@/config/demo";
import { formatDateTime, formatDuration } from "@/lib/fmt";

const STATUS: Record<BlockStatus, { tone: "brown" | "muted" | "green"; label: string }> = {
  active: { tone: "brown", label: "Active" },
  expired: { tone: "muted", label: "Expired" },
  unblocked: { tone: "green", label: "Unblocked" },
};

/** Blocked guests and the block log. Shared by the staff tab and the owner page; both can unblock. */
export function BlockedGuests() {
  const [view, setView] = useState<"list" | "log">("list");
  return (
    <>
      <div className="mb-4">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Blocked guests" },
            { value: "log", label: "Block log" },
          ]}
        />
      </div>
      {view === "list" ? <BlockList /> : <BlockLog />}
    </>
  );
}

function BlockList() {
  const id = useId();
  const [status, setStatus] = useState<BlockStatus | "all">("active");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unblock, setUnblock] = useState<BlockRow | null>(null);
  const q = useDeferredValue(query);
  const now = useNow(30_000);
  const filter = { status, q, from: from || undefined, to: to || undefined };
  const rows = useLive(() => listBlockedGuests(filter), JSON.stringify(filter), ["blocks"]);
  const all = useLive(() => listBlockedGuests({}), "all", ["blocks"]);
  const counts = { all: all.data?.length, active: 0, expired: 0, unblocked: 0 } as Record<string, number | undefined>;
  for (const r of all.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Segmented
          label="Status"
          size="sm"
          value={status}
          onChange={setStatus}
          options={(["active", "expired", "unblocked", "all"] as const).map((s) => ({
            value: s,
            label: s === "all" ? "All" : STATUS[s].label,
            count: counts[s],
          }))}
        />
        <div className="min-w-48 flex-1">
          <label htmlFor={`${id}-q`} className="sr-only">
            Search blocked guests
          </label>
          <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search table, reason, staff or order" className={inputClass} />
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor={`${id}-from`} className="mb-1 block text-sm font-semibold">
              From
            </label>
            <input id={`${id}-from`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} w-40`} />
          </div>
          <div>
            <label htmlFor={`${id}-to`} className="mb-1 block text-sm font-semibold">
              To
            </label>
            <input id={`${id}-to`} type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputClass} w-40`} />
          </div>
        </div>
      </div>

      {rows.error && !rows.data ? (
        <ErrorState error={rows.error} onRetry={rows.reload} />
      ) : !rows.data ? (
        <Loading label="Loading blocked guests" />
      ) : rows.data.length === 0 ? (
        <Empty title={status === "active" ? "No guests are blocked right now" : "Nothing matches"}>Blocks appear here when staff block a guest from an order or a table.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.data.map((b) => (
            <li key={b.id} className="rounded-card border border-sand bg-paper p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">Table {b.table}</span>
                    <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
                  </p>
                  <p className="text-sm text-muted tabular">Blocked {formatDateTime(b.blockedAt)} IST</p>
                </div>
                {b.status === "active" && (
                  <Button size="sm" onClick={() => setUnblock(b)}>
                    Unblock
                  </Button>
                )}
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted">Reason</dt>
                  <dd className="font-semibold">
                    {BLOCK_REASONS[b.reason]}
                    {b.note && <span className="block font-normal">{b.note}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-semibold">
                    {BLOCK_DURATIONS[b.duration]}
                    <span className="block font-normal">
                      {b.status === "active"
                        ? b.expiresAt === null
                          ? "Until unblocked"
                          : `${formatDuration(b.expiresAt - now)} left`
                        : b.status === "expired"
                          ? `Ended ${formatDateTime(b.expiresAt!)}`
                          : ""}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Blocked by</dt>
                  <dd className="font-semibold">{b.blockedBy}</dd>
                </div>
                <div>
                  <dt className="text-muted">Order</dt>
                  <dd>
                    <span className="font-semibold tabular">{b.orderId ?? "—"}</span>
                    {b.orderSummary && <span className="block">{b.orderSummary}</span>}
                  </dd>
                </div>
              </dl>
              {b.status === "unblocked" && (
                <p className="mt-3 rounded-thumb bg-cream px-3 py-2 text-sm">
                  Unblocked {formatDateTime(b.unblockedAt!)} by <span className="font-semibold">{b.unblockedBy}</span>
                  {b.unblockNote && <> · “{b.unblockNote}”</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <UnblockDialog row={unblock} onClose={() => setUnblock(null)} />
    </>
  );
}

function UnblockDialog({ row, onClose }: { row: BlockRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!row} onClose={onClose} title={row ? `Unblock the guest at table ${row.table}?` : "Unblock"} description="Their phone can order again after scanning the QR code.">
      {row && <UnblockForm key={row.id} row={row} onClose={onClose} />}
    </Dialog>
  );
}

function UnblockForm({ row, onClose }: { row: BlockRow; onClose: () => void }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm font-semibold">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id={`${id}-note`} rows={2} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Guest was seated in the garden" className={textareaClass} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="primary"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await unblockGuest(row.id, note);
              toast(`Guest at table ${row.table} unblocked`);
              onClose();
            } catch (e) {
              setError(errorText(e));
              setBusy(false);
            }
          }}
        >
          Unblock
        </Button>
      </div>
    </div>
  );
}

const EVENT: Record<"block" | "unblock" | "expire", { tone: "brown" | "green" | "muted"; label: string }> = {
  block: { tone: "brown", label: "Blocked" },
  unblock: { tone: "green", label: "Unblocked" },
  expire: { tone: "muted", label: "Expired" },
};

function BlockLog() {
  const id = useId();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const log = useLive(() => getBlockLog(q), `log:${q}`, ["blocks"]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-48 max-w-md flex-1">
          <label htmlFor={`${id}-q`} className="sr-only">
            Search the block log
          </label>
          <input id={`${id}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search table, staff, reason or order" className={inputClass} />
        </div>
        <p className="text-sm text-muted">Every block and unblock, kept for {demo.retentionMonths} months.</p>
      </div>
      {log.error && !log.data ? (
        <ErrorState error={log.error} onRetry={log.reload} />
      ) : !log.data ? (
        <Loading label="Loading the block log" />
      ) : log.data.length === 0 ? (
        <Empty title="Nothing in the log matches" />
      ) : (
        <ol className="divide-y divide-sand rounded-card border border-sand bg-paper">
          {log.data.map((e) => (
            <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_7rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
              <span className="text-sm text-muted tabular">{formatDateTime(e.at)}</span>
              <span>
                <Badge tone={EVENT[e.type].tone}>{EVENT[e.type].label}</Badge>
              </span>
              <span className="text-base">
                <span className="font-semibold">Table {e.table}</span> · {e.by}
                {e.detail && <span className="text-muted"> · {e.detail}</span>}
                {e.orderId && <span className="text-muted tabular"> · {e.orderId}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
