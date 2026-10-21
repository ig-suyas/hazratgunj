"use client";

import { useId, useState } from "react";
import { DietMark } from "@/components/diet-mark";
import type { MenuItem } from "@/lib/data";
import { NOTE_MAX, NOTE_PLACEHOLDER, choiceDetail, isVegChoice, unitPrice, type CartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { CloseIcon } from "./icons";
import { Stepper } from "./stepper";

type Props = {
  lines: CartLine[];
  items: Map<string, MenuItem>;
  table: string | null;
  tableFromQr: boolean;
  onTableChange: (table: string) => void;
  onQty: (id: string, qty: number) => void;
  onNote: (id: string, note: string) => void;
  onPlace: () => void;
  placing: boolean;
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
    const unit = unitPrice(item, line.variantId, line.selection);
    return [{ line, item, unit, detail: choiceDetail(item, line.variantId, line.selection), veg: isVegChoice(item, line.variantId, line.selection) }];
  });
  const count = rows.reduce((n, r) => n + r.line.qty, 0);
  const subtotal = rows.reduce((s, r) => s + r.unit * r.line.qty, 0);
  const canPlace = count > 0 && !!p.table && !p.placing;

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
            {rows.map(({ line, item, unit, detail, veg }) => (
              <li key={line.id} className="space-y-2 py-4">
                <div className="flex gap-2.5">
                  <DietMark veg={veg} className="mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    {detail && <p className="text-sm text-muted">{detail}</p>}
                  </div>
                  <p className="font-semibold tabular">{formatPrice(unit * line.qty)}</p>
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
          <div className="space-y-1 py-4">
            <p className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span className="tabular">{formatPrice(subtotal)}</span>
            </p>
            <p className="text-sm text-muted">{p.taxNote}</p>
          </div>
        )}
      </div>

      <footer className="sheet-footer">
        {!p.table && count > 0 && <p className="mb-2 text-center text-sm text-muted">Add your table number to place the order.</p>}
        <button
          type="button"
          disabled={!canPlace}
          onClick={p.onPlace}
          className="flex h-12 w-full items-center justify-between rounded-pill bg-bottle px-6 font-semibold text-paper shadow-card active:bg-bottle-deep disabled:bg-sand disabled:text-muted disabled:shadow-none"
        >
          <span>{p.placing ? "Placing order…" : "Place order"}</span>
          <span className="tabular">{formatPrice(subtotal)}</span>
        </button>
      </footer>
    </>
  );
}
