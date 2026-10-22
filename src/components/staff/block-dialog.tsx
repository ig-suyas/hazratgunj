"use client";

import { useId, useState } from "react";
import { useLive } from "@/components/app/hooks";
import { Button, Dialog, errorText, textareaClass, toast } from "@/components/app/ui";
import {
  BLOCK_DURATIONS,
  BLOCK_REASONS,
  blockGuest,
  getTableSession,
  orderSummary,
  type BlockDuration,
  type BlockReason,
  type Order,
} from "@/lib/api";
import { formatDateTime, formatTime, money } from "@/lib/fmt";

export type BlockTarget = { sessionId: string; table: number; order?: Order | null };

const NOTE_MAX = 120;

/**
 * "Block guest" sheet. Staff first check the table: someone who photographed
 * the QR code and left can keep ordering from home, and blocking stops them.
 */
export function BlockDialog({ target, onClose }: { target: BlockTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onClose={onClose} title={target ? `Block ordering at Table ${target.table}?` : "Block guest"} wide>
      {target && <BlockForm key={target.sessionId + (target.order?.id ?? "")} target={target} onClose={onClose} />}
    </Dialog>
  );
}

function BlockForm({ target, onClose }: { target: BlockTarget; onClose: () => void }) {
  const id = useId();
  const session = useLive(() => getTableSession(target.sessionId), target.sessionId, ["sessions", "orders"]);
  const [seated, setSeated] = useState<"no" | "yes" | null>(null);
  const [reason, setReason] = useState<BlockReason>("not-here");
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState<BlockDuration>("24h");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const order = target.order ?? session.data?.orders.at(-1) ?? null;
  const open = session.data?.orders.filter((o) => o.status === "received" || o.status === "preparing").length ?? 0;

  const submit = async () => {
    if (reason === "other" && !note.trim()) return setError("Add a short note for “Other”.");
    setBusy(true);
    setError(null);
    try {
      await blockGuest({ sessionId: target.sessionId, orderId: order?.id ?? null, reason, note, duration });
      toast(`Guest at table ${target.table} blocked${open ? ". Open orders were declined" : ""}`);
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-card border border-sand bg-cream px-4 py-3 text-base">
        <dt className="text-muted">Table</dt>
        <dd className="font-semibold tabular">{target.table}</dd>
        {order && (
          <>
            <dt className="text-muted">Order</dt>
            <dd>
              <span className="font-semibold tabular">{order.id}</span> · {money(order.total)}
              <span className="block text-sm text-muted">{orderSummary(order)}</span>
            </dd>
            <dt className="text-muted">Placed</dt>
            <dd className="tabular">{formatDateTime(order.placedAt)}</dd>
          </>
        )}
        {session.data && (
          <>
            <dt className="text-muted">Table opened</dt>
            <dd className="tabular">
              {formatTime(session.data.startedAt)} · {session.data.orders.length} {session.data.orders.length === 1 ? "order" : "orders"}
            </dd>
          </>
        )}
      </dl>

      <fieldset>
        <legend className="text-lg font-semibold">Is anyone sitting at this table?</legend>
        <p className="text-sm text-muted">Please check the table before blocking.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["no", "No, the table is empty"],
              ["yes", "Yes, guests are seated"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-thumb border border-sand bg-paper px-3 has-checked:border-bottle has-checked:shadow-ring">
              <input type="radio" name={`${id}-seated`} checked={seated === v} onChange={() => setSeated(v)} className="size-5 accent-bottle" />
              {label}
            </label>
          ))}
        </div>
        {seated === "yes" && (
          <p role="status" className="mt-2 rounded-thumb bg-beige/70 px-3 py-2 text-sm">
            If guests are seated, the order is probably theirs. Talk to them first; blocking is usually not needed.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Reason</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(BLOCK_REASONS) as BlockReason[]).map((r) => (
            <label key={r} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-thumb border border-sand bg-paper px-3 has-checked:border-bottle has-checked:shadow-ring">
              <input type="radio" name={`${id}-reason`} checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-bottle" />
              {BLOCK_REASONS[r]}
            </label>
          ))}
        </div>
        {reason === "other" && (
          <div className="mt-2">
            <label htmlFor={`${id}-note`} className="sr-only">
              Short note
            </label>
            <textarea
              id={`${id}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={2}
              maxLength={NOTE_MAX}
              placeholder="Short note, e.g. ordering from the parking area"
              className={textareaClass}
            />
            <p className="mt-1 text-right text-xs text-muted tabular">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">How long</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(BLOCK_DURATIONS) as BlockDuration[]).map((d) => (
            <label key={d} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-thumb border border-sand bg-paper px-3 has-checked:border-bottle has-checked:shadow-ring">
              <input type="radio" name={`${id}-duration`} checked={duration === d} onChange={() => setDuration(d)} className="size-5 accent-bottle" />
              {BLOCK_DURATIONS[d]}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-muted">
        The guest&apos;s phone can no longer order{open ? ` and ${open} open ${open === 1 ? "order is" : "orders are"} declined` : ""}. They only see “Ordering is unavailable
        right now”.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-sand pt-4">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" busy={busy} onClick={submit}>
          Block guest
        </Button>
      </div>
    </div>
  );
}
