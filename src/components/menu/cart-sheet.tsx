"use client";

import { useId, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import type { MenuItem } from "@/lib/api";
import { NOTE_MAX, NOTE_PLACEHOLDER, choiceDetail, isVegChoice, unitPrice, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { CloseIcon } from "./icons";
import { Stepper } from "./stepper";

type Props = {
  lines: CartLine[];
  items: Map<string, MenuItem>;
  isAvailable: (itemId: string) => boolean;
  /** Unit price after any running discount. */
  priceOf: (item: MenuItem, unit: number) => number;
  /** Table number as typed or from the QR token; null when not given yet. */
  table: string | null;
  tableFromQr: boolean;
  onTableChange: (table: string) => void;
  onQty: (id: string, qty: number) => void;
  onNote: (id: string, note: string) => void;
  /** Checks the session is still open; the review step opens only when it is. */
  onReview: () => Promise<boolean>;
  onPlace: () => void;
  placing: boolean;
  /** Why the last attempt failed, in calm words. */
  error: string | null;
  taxNote: string;
  onClose: () => void;
};

function NoteEditor({ line, onNote }: { line: CartLine; onNote: (id: string, note: string) => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return line.note ? (
      <p className="text-sm">
        <span className="text-muted">Note: </span>
        <span className="italic">{line.note}</span>{" "}
        <button type="button" onClick={() => setEditing(true)} className="min-h-8 font-semibold text-brass-ink underline decoration-brass underline-offset-2">
          Edit
        </button>
      </p>
    ) : (
      <button type="button" onClick={() => setEditing(true)} className="min-h-tap text-sm font-semibold text-brass-ink underline decoration-brass underline-offset-2">
        Add a note
      </button>
    );
  }
  return (
    <div className="w-full">
      <label htmlFor={id} className="sr-only">
        Note for the kitchen
      </label>
      <textarea
        id={id}
        autoFocus
        value={line.note}
        onChange={(e) => onNote(line.id, e.target.value)}
        maxLength={NOTE_MAX}
        rows={2}
        placeholder={NOTE_PLACEHOLDER}
        className="block w-full resize-none rounded-thumb border border-sand bg-paper px-3 py-2 text-base placeholder:text-muted/80 focus:border-bottle"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span className="tabular">
          {line.note.length}/{NOTE_MAX}
        </span>
        <button type="button" onClick={() => setEditing(false)} className="min-h-9 px-2 text-sm font-semibold text-bottle">
          Done
        </button>
      </div>
    </div>
  );
}

export function CartSheetBody(p: Props) {
  const tableId = useId();
  const rows = p.lines.flatMap((line) => {
    const item = p.items.get(line.itemId);
    if (!item) return [];
    const list = unitPrice(item, line.variantId, line.selection);
    const unit = p.priceOf(item, list);
    return [
      {
        line,
        item,
        list,
        unit,
        detail: choiceDetail(item, line.variantId, line.selection),
        veg: isVegChoice(item, line.variantId, line.selection),
      },
    ];
  });
  const count = rows.reduce((n, r) => n + r.line.qty, 0);
  const subtotal = rows.reduce((s, r) => s + r.list * r.line.qty, 0);
  const total = rows.reduce((s, r) => s + r.unit * r.line.qty, 0);
  const discount = subtotal - total;
  const soldOut = rows.filter((r) => !p.isAvailable(r.item.id));
  const canPlace = count > 0 && !!p.table && !p.placing && soldOut.length === 0;
  // Two steps in one sheet: the editable cart, then a read-only review the guest confirms.
  const [step, setStep] = useState<"cart" | "review">("cart");
  const [checking, setChecking] = useState(false);
  const review = async () => {
    if (!canPlace || checking) return;
    setChecking(true);
    const ok = await p.onReview();
    setChecking(false);
    if (ok) setStep("review");
  };

  if (step === "review" && count > 0) {
    return (
      <ReviewStep
        {...p}
        rows={rows}
        count={count}
        subtotal={subtotal}
        discount={discount}
        total={total}
        canConfirm={!!p.table && soldOut.length === 0}
        onBack={() => setStep("cart")}
      />
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-sand px-5 py-3">
        <div>
          <h2 id="cart-title" className="font-display text-title font-semibold">
            Your order
          </h2>
          <p className="text-sm text-muted tabular">
            {count} {count === 1 ? "item" : "items"}
          </p>
        </div>
        <button type="button" onClick={p.onClose} aria-label="Close" className="grid size-11 place-items-center rounded-pill text-charcoal">
          <CloseIcon />
        </button>
      </header>

      <div className="sheet-body px-5">
        <div className="py-4">
          {p.tableFromQr ? (
            <p className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Table</span>
              <span className="text-2xl font-semibold tabular">{p.table}</span>
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={tableId} className="text-sm font-semibold">
                Your table number
              </label>
              <input
                id={tableId}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={3}
                value={p.table ?? ""}
                onChange={(e) => p.onTableChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="e.g. 7"
                className="h-12 w-24 rounded-thumb border border-sand bg-paper px-3 text-center text-lg font-semibold tabular focus:border-bottle"
              />
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="border-t border-sand py-10 text-center text-muted">Your order is empty. Add dishes from the menu.</p>
        ) : (
          <ul className="divide-y divide-sand border-y border-sand">
            {rows.map(({ line, item, list, unit, detail, veg }) => (
              <li key={line.id} className="space-y-2 py-4">
                <div className="flex gap-2.5">
                  <DietMark veg={veg} className="mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    {detail && <p className="text-sm text-muted">{detail}</p>}
                    {!p.isAvailable(item.id) && <p className="text-sm font-semibold text-nonveg">Out of stock. Please remove it to order.</p>}
                  </div>
                  <p className="text-right font-semibold tabular">
                    {unit < list && <s className="block text-sm font-normal text-muted">{formatPrice(list * line.qty)}</s>}
                    {formatPrice(unit * line.qty)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pl-6">
                  <div className="min-w-0 flex-1">
                    <NoteEditor line={line} onNote={p.onNote} />
                  </div>
                  <Stepper
                    qty={line.qty}
                    label={item.name}
                    tone="outline"
                    onDecrement={() => p.onQty(line.id, line.qty - 1)}
                    onIncrement={() => p.onQty(line.id, line.qty + 1)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <dl className="space-y-1 py-4">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular">{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-bottle">
                <dt>Discount</dt>
                <dd className="tabular">−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatPrice(total)}</dd>
            </div>
            <p className="text-sm text-muted">{p.taxNote}</p>
          </dl>
        )}
      </div>

      <footer className="sheet-footer">
        {p.error ? (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-charcoal">
            {p.error}
          </p>
        ) : (
          !p.table && count > 0 && <p className="mb-2 text-center text-sm text-muted">Add your table number to place the order.</p>
        )}
        <button
          type="button"
          disabled={!canPlace || checking}
          onClick={review}
          className="flex h-12 w-full items-center justify-between rounded-pill bg-bottle px-6 font-semibold text-paper shadow-card active:bg-bottle-deep disabled:bg-sand disabled:text-muted disabled:shadow-none"
        >
          <span>{checking ? "Checking…" : "Review order"}</span>
          <span className="tabular">{formatPrice(total)}</span>
        </button>
      </footer>
    </>
  );
}

type Row = { line: CartLine; item: MenuItem; list: number; unit: number; detail: string | null; veg: boolean };

/** Read-only summary the guest checks before the order goes to the kitchen. */
function ReviewStep(
  p: Props & { rows: Row[]; count: number; subtotal: number; discount: number; total: number; canConfirm: boolean; onBack: () => void },
) {
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-sand px-5 py-3">
        <div>
          <h2 id="cart-title" className="font-display text-title font-semibold">
            Review your order
          </h2>
          <p className="text-sm text-muted tabular">
            {p.count} {p.count === 1 ? "item" : "items"}
          </p>
        </div>
        <button type="button" onClick={p.onClose} disabled={p.placing} aria-label="Close" className="grid size-11 place-items-center rounded-pill text-charcoal">
          <CloseIcon />
        </button>
      </header>

      <div className="sheet-body px-5">
        <p className="flex items-baseline justify-between py-4">
          <span className="text-sm text-muted">Table</span>
          <span className="text-2xl font-semibold tabular">{p.table}</span>
        </p>
        <ul className="divide-y divide-sand border-y border-sand">
          {p.rows.map(({ line, item, unit, detail, veg }) => (
            <li key={line.id} className="flex gap-2.5 py-3">
              <DietMark veg={veg} className="mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-semibold tabular">{line.qty} ×</span> <span className="font-semibold">{item.name}</span>
                </p>
                {detail && <p className="text-sm text-muted">{detail}</p>}
                {line.note && (
                  <p className="text-sm">
                    <span className="text-muted">Note: </span>
                    <span className="italic">{line.note}</span>
                  </p>
                )}
                {!p.isAvailable(item.id) && <p className="text-sm font-semibold text-nonveg">Out of stock. Go back to remove it.</p>}
              </div>
              <p className="text-right font-semibold tabular">{formatPrice(unit * line.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 py-4">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatPrice(p.subtotal)}</dd>
          </div>
          {p.discount > 0 && (
            <div className="flex justify-between text-bottle">
              <dt>Discount</dt>
              <dd className="tabular">−{formatPrice(p.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatPrice(p.total)}</dd>
          </div>
          <p className="text-sm text-muted">{p.taxNote}</p>
        </dl>
      </div>

      <footer className="sheet-footer">
        {p.error && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-charcoal">
            {p.error}
          </p>
        )}
        <button
          type="button"
          disabled={!p.canConfirm || p.placing}
          aria-busy={p.placing}
          onClick={p.onPlace}
          className="flex h-12 w-full items-center justify-between rounded-pill bg-bottle px-6 font-semibold text-paper shadow-card active:bg-bottle-deep disabled:bg-sand disabled:text-muted disabled:shadow-none"
        >
          <span>{p.placing ? "Sending order…" : "Confirm order"}</span>
          <span className="tabular">{formatPrice(p.total)}</span>
        </button>
        <button type="button" onClick={p.onBack} disabled={p.placing} className="mt-1 min-h-tap w-full text-sm font-semibold text-bottle disabled:text-muted">
          Back to cart
        </button>
        <p className="mt-1 text-center text-sm text-muted">Your order goes straight to our team.</p>
      </footer>
    </>
  );
}
