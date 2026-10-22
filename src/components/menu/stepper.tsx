import { MinusIcon, PlusIcon } from "./icons";

/** − qty + control. `tone` picks filled (on cards) or outlined (in sheets). */
export function Stepper({
  qty,
  onDecrement,
  onIncrement,
  label,
  tone = "filled",
  className = "",
}: {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  tone?: "filled" | "outline";
  className?: string;
}) {
  const shell =
    tone === "filled" ? "bg-bottle text-paper shadow-card" : "border border-sand bg-paper text-charcoal";
  return (
    <div role="group" aria-label={`Quantity of ${label}`} className={`inline-flex h-11 items-stretch rounded-pill ${shell} ${className}`}>
      <button type="button" onClick={onDecrement} aria-label={`Remove one ${label}`} className="grid w-11 place-items-center rounded-l-pill">
        <MinusIcon />
      </button>
      <span className="grid min-w-7 place-items-center font-semibold tabular" aria-live="polite">
        {qty}
      </span>
      <button type="button" onClick={onIncrement} aria-label={`Add one more ${label}`} className="grid w-11 place-items-center rounded-r-pill">
        <PlusIcon />
      </button>
    </div>
  );
}
