"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ApiError } from "@/lib/api";

/*
 * Building blocks for the staff and owner screens: cream and white surfaces,
 * brass hairlines, bottle green for primary actions. Styles: src/app/h/app.css.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-bottle text-paper border border-bottle hover:bg-bottle-deep disabled:bg-sand disabled:border-sand disabled:text-muted",
  secondary: "bg-paper text-bottle border border-bottle hover:bg-cream disabled:text-muted disabled:border-sand",
  ghost: "bg-transparent text-charcoal border border-transparent hover:bg-beige/60 disabled:text-muted",
  danger: "bg-paper text-nonveg border border-nonveg hover:bg-cream disabled:text-muted disabled:border-sand",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-base gap-2",
  lg: "h-14 px-6 text-lg gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  busy = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-pill font-semibold whitespace-nowrap transition-colors duration-(--dur-tap) disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {busy && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`app-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type Tone = "neutral" | "green" | "brass" | "brown" | "muted";
const TONE: Record<Tone, string> = {
  neutral: "bg-paper text-charcoal border-sand",
  green: "bg-paper text-bottle border-bottle",
  brass: "bg-cream text-brass-ink border-brass",
  brown: "bg-paper text-nonveg border-nonveg",
  muted: "bg-beige/60 text-muted border-transparent",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "", as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "li" }) {
  return <As className={`rounded-card border border-sand bg-paper ${className}`}>{children}</As>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-title font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-thumb border border-sand bg-paper px-3 text-base text-charcoal placeholder:text-muted/80 focus:border-bottle disabled:bg-cream disabled:text-muted";
export const selectClass = `${inputClass} pr-8`;
export const textareaClass =
  "block w-full resize-y rounded-thumb border border-sand bg-paper px-3 py-2.5 text-base text-charcoal placeholder:text-muted/80 focus:border-bottle";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-pill border border-sand bg-beige transition-colors duration-(--dur-ui) aria-checked:border-bottle aria-checked:bg-bottle disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`ml-1 size-6 rounded-pill bg-paper shadow-card transition-transform duration-(--dur-ui) ${checked ? "translate-x-6" : ""}`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-pill border border-sand bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-pill px-3 font-semibold text-muted aria-checked:bg-bottle aria-checked:text-paper ${size === "sm" ? "h-8 text-sm" : "h-10 text-base"}`}
        >
          {o.label}
          {o.count !== undefined && <span className="tabular text-sm">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-sand bg-cream/60 px-5 py-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="app-skeleton h-16 rounded-card" />
      ))}
    </div>
  );
}

export function errorText(e: unknown) {
  if (e instanceof ApiError) return e.message || "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-card border border-nonveg/40 bg-paper px-5 py-6 text-center">
      <p className="font-semibold">This could not be loaded.</p>
      <p className="mt-1 text-sm text-muted">{errorText(error)}</p>
      {onRetry && (
        <Button className="mt-3" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Data label shown on every screen that uses the generated dataset. */
export function DemoDataLabel({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-pill border border-brass px-2 py-0.5 text-micro font-semibold tracking-wide text-brass-ink uppercase ${className}`}>
      Demo data
    </span>
  );
}

// --- Dialog ------------------------------------------------------------------

/** Modal built on <dialog>: focus is trapped, Esc closes, focus returns to the opener. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const wanted = useRef(open);
  useEffect(() => {
    wanted.current = open;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${wide ? "app-dialog-wide" : ""}`}
      aria-labelledby={titleId}
      onClose={() => wanted.current && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <>
          <div className="app-dialog-body">
            <h2 id={titleId} className="font-display text-title font-semibold">
              {title}
            </h2>
            {description && <div className="mt-1 text-base text-muted">{description}</div>}
            {children && <div className="mt-4">{children}</div>}
          </div>
          {footer && <div className="app-dialog-footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "primary",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} busy={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-nonveg">
          {error}
        </p>
      )}
    </Dialog>
  );
}

// --- Toasts ------------------------------------------------------------------

type ToastItem = { id: number; text: string };
let toasts: ToastItem[] = [];
const toastListeners = new Set<() => void>();
let toastSeq = 0;

/** Short confirmation at the bottom of the screen. */
export function toast(text: string) {
  const id = ++toastSeq;
  toasts = [...toasts, { id, text }];
  toastListeners.forEach((l) => l());
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l());
  }, 3200);
}

const subscribeToasts = (cb: () => void) => {
  toastListeners.add(cb);
  return () => {
    toastListeners.delete(cb);
  };
};
const noToasts: ToastItem[] = [];

export function Toaster() {
  const list = useSyncExternalStore(
    subscribeToasts,
    () => toasts,
    () => noToasts,
  );
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {list.map((t) => (
        <p key={t.id} className="app-toast pointer-events-auto max-w-md rounded-pill bg-charcoal px-5 py-3 text-base text-paper shadow-raised">
          {t.text}
        </p>
      ))}
    </div>
  );
}
