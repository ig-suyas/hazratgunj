"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { inputClass } from "@/components/app/ui";
import type { Timeline } from "@/lib/api";
import { addDays, count, dayLabel, dayLong, daysBetween, money, moneyShort, monthLabel, rangeLabel, WEEKDAYS, weekdayOf } from "@/lib/fmt";

/**
 * The one date-range control for the owner screens: a 12-month calendar
 * heatmap, a daily sales line with a brass range band, and month chips and
 * preset pills. All three edit the same range. Plain SVG and theme tokens
 * only (no chart library), so it is light enough for the orders list too.
 */

export type Range = { from: string; to: string };
export type Preset = "today" | "7d" | "month" | "lastMonth" | "3m" | "year" | "custom";
export const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "3m", label: "3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

export function presetRange(p: Preset, today: string, start: string): Range {
  const clamp = (r: Range) => ({ from: r.from < start ? start : r.from, to: r.to });
  const month = today.slice(0, 8) + "01";
  switch (p) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return clamp({ from: addDays(today, -6), to: today });
    case "month":
      return clamp({ from: month, to: today });
    case "lastMonth": {
      const last = addDays(month, -1);
      return clamp({ from: last.slice(0, 8) + "01", to: last });
    }
    case "3m":
      return clamp({ from: addDays(today, -89), to: today });
    case "year":
      return clamp({ from: `${today.slice(0, 4)}-01-01`, to: today });
    default:
      return clamp({ from: addDays(today, -29), to: today });
  }
}

/** Months in the window, oldest first ("2025-10" … "2026-10"). */
export function monthsBetween(start: string, end: string) {
  const out: string[] = [];
  for (let k = start.slice(0, 7); k <= end.slice(0, 7); ) {
    out.push(k);
    const [y, m] = k.split("-").map(Number);
    k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  return out;
}

/** A whole month, clipped to the window. */
export function monthRange(m: string, start: string, end: string): Range {
  const [y, mo] = m.split("-").map(Number);
  const last = `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`;
  return { from: `${m}-01` < start ? start : `${m}-01`, to: last > end ? end : last };
}

function matchPreset(r: Range, today: string, start: string): Preset | null {
  for (const p of PRESETS) {
    if (p.value === "custom") continue;
    const x = presetRange(p.value, today, start);
    if (x.from === r.from && x.to === r.to) return p.value;
  }
  return null;
}

// Single-hue ramp mixed from the theme's grounds and brass (index 0 = no sales).
const RAMP = [
  "var(--color-cream)",
  "color-mix(in oklab, var(--color-cream), var(--color-sand) 50%)",
  "var(--color-sand)",
  "color-mix(in oklab, var(--color-sand), var(--color-brass) 50%)",
  "var(--color-brass)",
  "color-mix(in oklab, var(--color-brass), var(--color-brass-ink) 60%)",
];

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** A length token (rem or px) in CSS pixels. */
function tokenPx(name: string) {
  const css = getComputedStyle(document.documentElement);
  const v = css.getPropertyValue(name).trim();
  const n = parseFloat(v) || 0;
  return v.endsWith("rem") ? n * parseFloat(css.fontSize) : n;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.clientWidth)); // first size at once, not on the next frame
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Hover = { i: number; src: "cal" | "line"; x?: number; y?: number };
type Shared = {
  days: Timeline["days"];
  i0: number;
  i1: number;
  hover: Hover | null;
  setHover: (h: Hover | null) => void;
  span: (a: number, b: number) => Range;
  /** Shown while dragging; null drops it. */
  onDraft: (r: Range | null) => void;
  onCommit: (r: Range) => void;
  /** Keyboard steps: shown at once, applied after a short pause. */
  onSoon: (r: Range) => void;
};

export function RangeTimeline({ timeline, value, onChange }: { timeline: Timeline; value: Range; onChange: (r: Range) => void }) {
  const id = useId();
  const { start, end: today, days } = timeline;
  const n = days.length;
  const [preset, setPreset] = useState<Preset | null>(() => matchPreset(value, today, start));
  const [draft, setDraft] = useState<Range | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const shown = draft ?? value;
  const index = useMemo(() => new Map(days.map((d, i) => [d.key, i])), [days]);
  const at = (key: string) => index.get(key) ?? (key < start ? 0 : n - 1);
  const i0 = at(shown.from);
  const i1 = at(shown.to);
  const span = (a: number, b: number): Range => ({ from: days[Math.min(a, b)].key, to: days[Math.max(a, b)].key });
  const fit = (r: Range): Range => {
    const c = (k: string) => (k < start ? start : k > today ? today : k);
    const a = c(r.from);
    const b = c(r.to);
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  };

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const commit = (r: Range, keepPreset = false) => {
    window.clearTimeout(timer.current);
    setDraft(null);
    if (!keepPreset) setPreset(matchPreset(r, today, start) ?? "custom");
    if (r.from !== value.from || r.to !== value.to) onChange(r);
  };
  const commitSoon = (r: Range) => {
    setDraft(r);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(r), 300);
  };
  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") commit(presetRange(p, today, start), true);
  };

  const months = useMemo(() => monthsBetween(start, today), [start, today]);
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chips.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const shared: Shared = { days, i0, i1, hover, setHover, span, onDraft: setDraft, onCommit: (r) => commit(r), onSoon: commitSoon };
  const nDays = daysBetween(shown.from, shown.to) + 1;

  return (
    <div className="min-w-0">
      <div className="no-scrollbar -mx-1.5 flex gap-2 overflow-x-auto p-1.5" role="radiogroup" aria-label="Date range">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={preset === p.value}
            onClick={() => choose(p.value)}
            className="tl-chip min-h-11 shrink-0 rounded-pill border border-sand bg-paper px-4 text-sm font-semibold text-muted hover:border-brass hover:text-charcoal aria-checked:border-bottle aria-checked:bg-bottle aria-checked:text-paper"
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
          <div className="min-w-0">
            <label htmlFor={`${id}-f`} className="mb-1 block text-sm font-semibold">
              From
            </label>
            <input id={`${id}-f`} type="date" min={start} max={today} value={value.from} onChange={(e) => e.target.value && commit(fit({ ...value, from: e.target.value }), true)} className={inputClass} />
          </div>
          <div className="min-w-0">
            <label htmlFor={`${id}-t`} className="mb-1 block text-sm font-semibold">
              To
            </label>
            <input id={`${id}-t`} type="date" min={start} max={today} value={value.to} onChange={(e) => e.target.value && commit(fit({ ...value, to: e.target.value }), true)} className={inputClass} />
          </div>
        </div>
      )}

      <p className="mt-3 text-sm" aria-live="polite">
        <span className="text-muted">Showing </span>
        <span className="font-semibold tabular">{rangeLabel(shown.from, shown.to)}</span>
        <span className="text-muted tabular">
          {" "}
          · {count(nDays)} {nDays === 1 ? "day" : "days"}
        </span>
      </p>
      <p id={`${id}-help`} className="mb-3 text-sm text-muted">
        Drag across the calendar or the line to pick days; tap a day for that day only. On a phone, press and hold, then drag.
      </p>

      <Calendar {...shared} start={start} helpId={`${id}-help`} />
      <SalesLine {...shared} />

      <div ref={chips} className="no-scrollbar -mx-1.5 mt-2 flex gap-2 overflow-x-auto p-1.5" role="group" aria-label="Jump to a month">
        {months.map((m) => {
          const r = monthRange(m, start, today);
          return (
            <button
              key={m}
              type="button"
              onClick={() => commit(r)}
              aria-pressed={value.from === r.from && value.to === r.to}
              aria-label={monthLabel(m)}
              className="tl-chip min-h-11 shrink-0 rounded-pill border border-sand bg-paper px-3.5 text-sm font-semibold text-muted tabular hover:border-brass hover:text-charcoal aria-pressed:border-brass aria-pressed:bg-brass/15 aria-pressed:text-brass-ink"
            >
              {monthLabel(m, true)} {m.slice(2, 4)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- A: calendar heatmap ----------------------------------------------------------

const LABEL_W = 30;
const TOP = 18;

function Calendar({ days, i0, i1, hover, setHover, span, onDraft, onCommit, onSoon, start, helpId }: Shared & { start: string; helpId: string }) {
  const [box, width] = useWidth<HTMLDivElement>();
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [radius] = useState(() => tokenPx("--radius-xs"));
  const [cursor, setCursor] = useState(i1);
  const [dragging, setDragging] = useState(false);
  const [say, setSay] = useState("");
  const n = days.length;
  const w0 = weekdayOf(start);
  const cols = Math.ceil((n + w0) / 7);
  const pitch = clampN(Math.floor((width - LABEL_W) / cols), 14, 20);
  const size = pitch - 3;
  const H = TOP + 7 * pitch;
  const pos = (i: number) => ({ col: Math.floor((i + w0) / 7), row: (i + w0) % 7 });

  const level = useMemo(() => {
    const vals = days
      .map((d) => d.sales)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] ?? 0;
    const cuts = [q(0.2), q(0.4), q(0.6), q(0.8)];
    return days.map((d) => (d.sales <= 0 ? 0 : 1 + cuts.filter((c) => d.sales > c).length));
  }, [days]);

  const marks = useMemo(() => {
    const out: { col: number; label: string }[] = [];
    days.forEach((d, i) => {
      if (i !== 0 && !d.key.endsWith("-01")) return;
      const col = Math.floor((i + w0) / 7);
      const m = d.key.slice(0, 7);
      const label = i === 0 || m.endsWith("-01") ? `${monthLabel(m, true)} ${m.slice(2, 4)}` : monthLabel(m, true);
      const prev = out[out.length - 1];
      if (prev && col - prev.col < 3) {
        if (out.length === 1) out[0] = { col, label: `${monthLabel(m, true)} ${m.slice(2, 4)}` };
        return;
      }
      out.push({ col, label });
    });
    return out;
  }, [days, w0]);

  const cells = useMemo(
    () =>
      days.map((d, i) => {
        const col = Math.floor((i + w0) / 7);
        const row = (i + w0) % 7;
        return (
          <rect
            key={d.key}
            x={col * pitch}
            y={TOP + row * pitch}
            width={size}
            height={size}
            rx={radius}
            className="tl-fade"
            style={{ fill: RAMP[level[i]], opacity: i >= i0 && i <= i1 ? 1 : 0.3 }}
          />
        );
      }),
    [days, w0, pitch, size, radius, level, i0, i1],
  );

  // Keep the end of the range in view (the latest days on first load).
  const skipScroll = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const x = Math.floor((i1 + w0) / 7) * pitch;
    if (x + pitch > el.scrollLeft + el.clientWidth || x < el.scrollLeft) {
      skipScroll.current = true;
      el.scrollLeft = Math.max(0, x + pitch * 4 - el.clientWidth);
    }
  }, [i1, w0, pitch]);

  const reveal = (i: number) => {
    const el = scroller.current!;
    const x = pos(i).col * pitch;
    const pad = pitch * 2;
    let next = el.scrollLeft;
    if (x < el.scrollLeft + pad) next = Math.max(0, x - pad);
    else if (x + pitch > el.scrollLeft + el.clientWidth - pad) next = x + pitch + pad - el.clientWidth;
    if (next !== el.scrollLeft) {
      skipScroll.current = true;
      el.scrollLeft = next;
    }
  };
  const tip = (i: number): Hover => {
    const { col, row } = pos(i);
    return { i, src: "cal", x: LABEL_W + col * pitch + size / 2 - (scroller.current?.scrollLeft ?? 0), y: TOP + row * pitch };
  };
  const cellAt = (cx: number, cy: number, clamp: boolean) => {
    const r = svg.current!.getBoundingClientRect();
    let col = Math.floor((cx - r.left) / pitch);
    let row = Math.floor((cy - r.top - TOP) / pitch);
    if (!clamp && (col < 0 || col >= cols || row < 0 || row > 6)) return null;
    col = clampN(col, 0, cols - 1);
    row = clampN(row, 0, 6);
    const i = col * 7 + row - w0;
    if (i < 0 || i >= n) return clamp ? clampN(i, 0, n - 1) : null;
    return i;
  };

  const drag = useRef<{ anchor: number; last: number } | null>(null);
  const begin = (i: number) => {
    drag.current = { anchor: i, last: i };
    setDragging(true);
    onDraft(span(i, i));
  };
  const extend = (i: number) => {
    const d = drag.current;
    if (!d || i === d.last) return;
    d.last = i;
    onDraft(span(d.anchor, i));
  };
  const finish = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d) onCommit(span(d.anchor, d.last));
  };

  // Touch: a swipe scrolls, a tap picks a day, press-and-hold then drag picks a range.
  const live = useRef({ cellAt, begin, extend, finish, tap: (() => {}) as (i: number) => void, cancel: () => {} });
  const hideTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    live.current = {
      cellAt,
      begin,
      extend,
      finish,
      tap: (i) => {
        onCommit(span(i, i));
        setHover(tip(i));
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setHover(null), 2500);
      },
      cancel: () => {
        drag.current = null;
        setDragging(false);
        onDraft(null);
      },
    };
  });
  useEffect(() => {
    const el = svg.current!;
    let mode: "idle" | "wait" | "drag" = "idle";
    let hold = 0;
    let sx = 0;
    let sy = 0;
    let anchor = 0;
    const onStart = (e: TouchEvent) => {
      window.clearTimeout(hold);
      if (e.touches.length !== 1) return void (mode = "idle");
      const t = e.touches[0];
      const i = live.current.cellAt(t.clientX, t.clientY, false);
      if (i === null) return void (mode = "idle");
      sx = t.clientX;
      sy = t.clientY;
      anchor = i;
      mode = "wait";
      hold = window.setTimeout(() => {
        mode = "drag";
        live.current.begin(anchor);
      }, 350);
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (mode === "wait" && Math.hypot(t.clientX - sx, t.clientY - sy) > 8) {
        window.clearTimeout(hold);
        mode = "idle";
      } else if (mode === "drag") {
        e.preventDefault();
        const i = live.current.cellAt(t.clientX, t.clientY, true);
        if (i !== null) live.current.extend(i);
      }
    };
    const onEnd = (e: TouchEvent) => {
      window.clearTimeout(hold);
      if (mode === "wait") {
        e.preventDefault();
        live.current.tap(anchor);
      } else if (mode === "drag") live.current.finish();
      mode = "idle";
    };
    const onCancel = () => {
      window.clearTimeout(hold);
      if (mode === "drag") live.current.cancel();
      mode = "idle";
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onCancel);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(hideTimer.current);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    const i = cellAt(e.clientX, e.clientY, false);
    if (i === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    begin(i);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") return;
    const i = cellAt(e.clientX, e.clientY, !!drag.current);
    if (i === null) return void (hover?.src === "cal" && setHover(null));
    if (hover?.i !== i || hover.src !== "cal") setHover(tip(i));
    extend(i);
  };

  const describe = (i: number) => `${dayLong(days[i].key)}: ${money(days[i].sales)} sales, ${count(days[i].orders)} orders`;
  const kbAnchor = useRef<number | null>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1, PageUp: -28, PageDown: 28 };
    let next: number;
    if (e.key in steps) next = cursor + steps[e.key];
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      kbAnchor.current = cursor;
      onCommit(span(cursor, cursor));
      setSay(`Picked ${dayLong(days[cursor].key)}`);
      return;
    } else if (e.key === "Escape") return setHover(null);
    else return;
    e.preventDefault();
    next = clampN(next, 0, n - 1);
    if (!e.shiftKey) kbAnchor.current = null;
    setCursor(next);
    reveal(next);
    setHover(tip(next));
    if (e.shiftKey) {
      const a = kbAnchor.current ?? cursor;
      kbAnchor.current = a;
      onSoon(span(a, next));
      setSay(`${describe(next)}. Range ${rangeLabel(days[Math.min(a, next)].key, days[Math.max(a, next)].key)}`);
    } else setSay(describe(next));
  };

  const ring = (i: number, cls: string, stroke: string) => {
    const { col, row } = pos(i);
    return <rect x={col * pitch - 1.5} y={TOP + row * pitch - 1.5} width={size + 3} height={size + 3} rx={radius + 1} className={cls} style={{ fill: "none", stroke, strokeWidth: 1.5 }} />;
  };
  const hd = hover?.src === "cal" && hover.x !== undefined ? days[hover.i] : null;

  return (
    <div ref={box} className="relative">
      <div className="flex">
        <svg width={LABEL_W} height={H} aria-hidden="true" className="shrink-0">
          {[0, 2, 4].map((r) => (
            <text key={r} x={0} y={TOP + r * pitch + size / 2} dominantBaseline="central" className="fill-muted text-micro">
              {WEEKDAYS[r]}
            </text>
          ))}
        </svg>
        <div
          ref={scroller}
          tabIndex={0}
          role="group"
          aria-label="Daily sales calendar, last 12 months. Arrow keys move by day and week, Enter picks a day, Shift with arrows picks a range."
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            if (!e.currentTarget.matches(":focus-visible")) return;
            reveal(cursor);
            setHover(tip(cursor));
            setSay(describe(cursor));
          }}
          onBlur={() => setHover(null)}
          onScroll={() => {
            if (skipScroll.current) skipScroll.current = false;
            else if (hover?.src === "cal") setHover(null);
          }}
          className="tl-scroll min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-xs pb-1"
        >
          <svg
            ref={svg}
            width={cols * pitch}
            height={H}
            aria-hidden="true"
            className={`tl-cal block ${dragging ? "tl-live" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => e.pointerType !== "touch" && finish()}
            onPointerCancel={() => drag.current && live.current.cancel()}
            onPointerLeave={(e) => e.pointerType === "mouse" && !drag.current && hover?.src === "cal" && setHover(null)}
          >
            {marks.map((m) => (
              <text key={m.col} x={m.col * pitch} y={11} className="fill-muted text-micro">
                {m.label}
              </text>
            ))}
            {cells}
            {ring(i0, "tl-fade", "var(--color-brass-ink)")}
            {i1 !== i0 && ring(i1, "tl-fade", "var(--color-brass-ink)")}
            {hover && ring(hover.i, "", "var(--color-bottle)")}
          </svg>
        </div>
      </div>
      {hd && hover?.x !== undefined && (
        <div
          className="tl-tip pointer-events-none absolute z-10 w-max rounded-thumb border border-sand bg-paper px-3 py-2 text-sm shadow-card"
          style={{ left: clampN(hover.x, 84, Math.max(84, width - 84)), top: hover.y! - 6, transform: "translate(-50%, -100%)" }}
        >
          <p className="font-semibold">{dayLong(hd.key)}</p>
          <p className="text-muted tabular">
            {money(hd.sales)} · {count(hd.orders)} orders
          </p>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-end gap-1.5 text-micro text-muted" aria-hidden="true">
        Less
        {RAMP.slice(1).map((c) => (
          <span key={c} className="size-2.5 rounded-xs" style={{ background: c }} />
        ))}
        More
      </div>
      <p className="sr-only" aria-live="polite">
        {say}
      </p>
    </div>
  );
}

// --- B: sales line with the range band ----------------------------------------------

/** 1, 2, 2.5 or 5 × a power of ten. */
function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Monotone cubic curve through the points (never overshoots a peak). */
function smoothPath(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i] || 1e-6;
    m[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const t = new Array<number>(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(xs[i] + h)},${f(ys[i] + t[i] * h)} ${f(xs[i + 1] - h)},${f(ys[i + 1] - t[i + 1] * h)} ${f(xs[i + 1])},${f(ys[i + 1])}`;
  }
  return d;
}

const PAD_L = 44;
const PAD_R = 14;
const PAD_T = 26;
const PLOT_H = 118;
const AXIS = PAD_T + PLOT_H;
const LINE_H = AXIS + 42;

function SalesLine({ days, i0, i1, hover, setHover, span, onDraft, onCommit, onSoon }: Shared) {
  const [box, W] = useWidth<HTMLDivElement>();
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const n = days.length;
  const step = n > 1 ? Math.max(0, W - PAD_L - PAD_R) / (n - 1) : 0;
  const X = (i: number) => PAD_L + i * step;

  const scale = useMemo(() => {
    const max = Math.max(1, ...days.map((d) => d.sales));
    const s = niceStep(max / 3);
    const top = Math.ceil(max / s) * s;
    return { top, ticks: Array.from({ length: Math.round(top / s) }, (_, k) => (k + 1) * s) };
  }, [days]);
  const Y = (v: number) => AXIS - (v / scale.top) * PLOT_H;

  const paths = useMemo(() => {
    if (W <= PAD_L + PAD_R) return null;
    const xs = days.map((_, i) => PAD_L + i * step);
    const ys = days.map((d) => AXIS - (d.sales / scale.top) * PLOT_H);
    const line = smoothPath(xs, ys);
    return { line, area: `${line}L${xs[n - 1].toFixed(1)},${AXIS}L${xs[0].toFixed(1)},${AXIS}Z` };
  }, [days, W, step, scale, n]);

  // The three best days, at least three weeks apart.
  const peaks = useMemo(() => {
    const out: number[] = [];
    for (const i of days.map((_, i) => i).sort((a, b) => days[b].sales - days[a].sales)) {
      if (out.every((j) => Math.abs(i - j) >= 21)) out.push(i);
      if (out.length === 3) break;
    }
    return out;
  }, [days]);

  const ticksX = useMemo(() => {
    const out: { i: number; label: string }[] = [];
    let last = -Infinity;
    days.forEach((d, i) => {
      if (!d.key.endsWith("-01")) return;
      const x = PAD_L + i * step;
      if (x - last < 34 || x > W - PAD_R - 12) return;
      out.push({ i, label: monthLabel(d.key.slice(0, 7), true) });
      last = x;
    });
    return out;
  }, [days, step, W]);

  const idxAt = (cx: number) => clampN(Math.round((cx - svg.current!.getBoundingClientRect().left - PAD_L) / (step || 1)), 0, n - 1);
  const drag = useRef<{ mode: "from" | "to" | "pan" | "brush"; anchor: number; x0: number; moved: boolean; off: number; len: number; last: Range | null } | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const handle = (e.target as Element).closest("[data-handle]")?.getAttribute("data-handle");
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    if (!handle && y > AXIS + 4) return;
    const i = idxAt(e.clientX);
    const whole = i0 === 0 && i1 === n - 1;
    const mode = handle === "from" || handle === "to" ? handle : i >= i0 && i <= i1 && !whole ? "pan" : "brush";
    drag.current = { mode, anchor: mode === "from" ? i1 : mode === "to" ? i0 : i, x0: e.clientX, moved: false, off: i - i0, len: i1 - i0, last: null };
    e.currentTarget.setPointerCapture(e.pointerId);
    window.clearTimeout(hideTimer.current);
    setHover({ i, src: "line" });
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const i = idxAt(e.clientX);
    const d = drag.current;
    if (!d && e.pointerType !== "mouse") return;
    if (hover?.i !== i || hover.src !== "line") setHover({ i, src: "line" });
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) < 4) return;
    if (!d.moved) setDragging(true);
    d.moved = true;
    if (d.mode === "pan") {
      const s = clampN(i - d.off, 0, n - 1 - d.len);
      d.last = span(s, s + d.len);
    } else d.last = span(d.anchor, i);
    onDraft(d.last);
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d?.moved && d.last) onCommit(d.last);
    if (e.pointerType !== "mouse") hideTimer.current = window.setTimeout(() => setHover(null), 2500);
  };

  const onHandleKey = (which: "from" | "to") => (e: KeyboardEvent<SVGGElement>) => {
    const cur = which === "from" ? i0 : i1;
    const lo = which === "from" ? 0 : i0;
    const hi = which === "from" ? i1 : n - 1;
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -7, PageUp: 7 };
    let next: number;
    if (e.key in steps) next = cur + steps[e.key];
    else if (e.key === "Home") next = lo;
    else if (e.key === "End") next = hi;
    else return;
    e.preventDefault();
    next = clampN(next, lo, hi);
    onSoon(which === "from" ? span(next, i1) : span(i0, next));
    setHover({ i: next, src: "line" });
  };

  const bx0 = Math.max(PAD_L, X(i0) - step / 2);
  const bx1 = Math.min(W - PAD_R, Math.max(X(i1) + step / 2, bx0 + 2));
  const hd = hover ? days[hover.i] : null;
  const hx = hover ? X(hover.i) : 0;
  const handle = (which: "from" | "to", x: number, i: number) => (
    <g
      data-handle={which}
      tabIndex={0}
      role="slider"
      aria-label={which === "from" ? "Start date" : "End date"}
      aria-valuemin={0}
      aria-valuemax={n - 1}
      aria-valuenow={i}
      aria-valuetext={dayLong(days[i].key)}
      onKeyDown={onHandleKey(which)}
      onFocus={() => setHover({ i, src: "line" })}
      onBlur={() => setHover(null)}
      className="tl-handle tl-move"
      style={{ transform: `translate(${x}px, ${AXIS}px)` }}
    >
      <circle r={22} style={{ fill: "transparent" }} />
      <circle r={14} className="tl-ring" style={{ fill: "none", stroke: "var(--color-bottle)", strokeWidth: 2 }} />
      <circle r={9} style={{ fill: "var(--color-paper)", stroke: "var(--color-brass)", strokeWidth: 2 }} />
      <path d="M-2,-3.5V3.5M2,-3.5V3.5" style={{ stroke: "var(--color-brass-ink)", strokeWidth: 1.25, strokeLinecap: "round" }} />
    </g>
  );

  return (
    <div ref={box} className="relative mt-4">
      {paths && (
        <svg
          ref={svg}
          width={W}
          height={LINE_H}
          role="group"
          aria-label="Daily sales line, last 12 months, with the selected range"
          className={`tl-line block ${dragging ? "tl-live" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
            onDraft(null);
          }}
          onPointerLeave={(e) => e.pointerType === "mouse" && !drag.current && setHover(null)}
        >
          <g aria-hidden="true">
            {scale.ticks.map((v) => (
              <g key={v}>
                <line x1={PAD_L} x2={W - PAD_R} y1={Y(v)} y2={Y(v)} style={{ stroke: "var(--color-sand)", strokeDasharray: "1 4", strokeLinecap: "round" }} />
                <text x={PAD_L - 8} y={Y(v)} textAnchor="end" dominantBaseline="central" className="fill-muted text-micro tabular">
                  {moneyShort(v)}
                </text>
              </g>
            ))}
            <path d={paths.area} style={{ fill: "color-mix(in oklab, var(--color-bottle) 9%, transparent)" }} />
            <path d={paths.line} style={{ fill: "none", stroke: "var(--color-bottle)", strokeWidth: 1.5, strokeLinejoin: "round" }} />
            {peaks.map((i) => {
              const x = X(i);
              const anchor = x < PAD_L + 50 ? "start" : x > W - PAD_R - 50 ? "end" : "middle";
              return (
                <g key={i}>
                  <circle cx={x} cy={Y(days[i].sales)} r={3} style={{ fill: "var(--color-brass-ink)" }} />
                  <text x={x} y={Y(days[i].sales) - 8} textAnchor={anchor} className="fill-brass-ink text-micro font-semibold tabular">
                    {dayLabel(days[i].key, false)} · {moneyShort(days[i].sales)}
                  </text>
                </g>
              );
            })}

            {/* Outside the range: dimmed. Inside: a brass band. */}
            <rect x={0} y={PAD_T - 14} width={1} height={PLOT_H + 14} className="tl-move" style={{ fill: "var(--color-paper)", opacity: 0.62, transform: `translateX(${PAD_L}px) scaleX(${bx0 - PAD_L})` }} />
            <rect x={0} y={PAD_T - 14} width={1} height={PLOT_H + 14} className="tl-move" style={{ fill: "var(--color-paper)", opacity: 0.62, transform: `translateX(${bx1}px) scaleX(${Math.max(0, W - PAD_R - bx1)})` }} />
            <rect x={0} y={PAD_T - 14} width={1} height={PLOT_H + 14} className="tl-move" style={{ fill: "color-mix(in oklab, var(--color-brass) 16%, transparent)", transform: `translateX(${bx0}px) scaleX(${bx1 - bx0})` }} />
            <line x1={PAD_L} x2={W - PAD_R} y1={AXIS} y2={AXIS} style={{ stroke: "var(--color-sand)" }} />
            <line x1={0} x2={0} y1={PAD_T - 14} y2={AXIS} className="tl-move" style={{ stroke: "var(--color-brass)", strokeWidth: 1.5, transform: `translateX(${bx0}px)` }} />
            <line x1={0} x2={0} y1={PAD_T - 14} y2={AXIS} className="tl-move" style={{ stroke: "var(--color-brass)", strokeWidth: 1.5, transform: `translateX(${bx1}px)` }} />
            <line x1={bx0} x2={bx1} y1={AXIS} y2={AXIS} style={{ stroke: "var(--color-brass)", strokeWidth: 2 }} />

            {ticksX.map((t) => (
              <text key={t.i} x={X(t.i)} y={AXIS + 32} textAnchor="middle" className="fill-muted text-micro">
                {t.label}
              </text>
            ))}

            {hd && (
              <g>
                <line x1={hx} x2={hx} y1={PAD_T - 14} y2={AXIS} style={{ stroke: "var(--color-muted)", strokeDasharray: "2 3" }} />
                <circle cx={hx} cy={Y(hd.sales)} r={4} style={{ fill: "var(--color-paper)", stroke: "var(--color-bottle)", strokeWidth: 2 }} />
              </g>
            )}
          </g>
          {handle("from", bx0, i0)}
          {handle("to", bx1, i1)}
        </svg>
      )}
      {hd && hover?.src === "line" && (
        <div
          className="tl-tip pointer-events-none absolute z-10 w-max rounded-thumb border border-sand bg-paper px-3 py-2 text-sm shadow-card"
          style={{ top: PAD_T - 14, left: hx, transform: hx > W / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <p className="font-semibold">{dayLong(hd.key)}</p>
          <p className="text-muted tabular">
            {money(hd.sales)} · {count(hd.orders)} orders
          </p>
        </div>
      )}
    </div>
  );
}
