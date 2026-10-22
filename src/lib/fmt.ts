import { formatPrice } from "./format";

/**
 * Dates and numbers for the ordering, staff and owner screens. Every date is
 * in India time (IST, UTC+5:30), whatever the device's own time zone.
 * Day keys are "YYYY-MM-DD" strings in IST.
 */

const IST = 330 * 60_000;
const TZ = "Asia/Kolkata";
export const DAY = 86_400_000;

/** IST calendar parts of a timestamp. weekday: 0 = Monday … 6 = Sunday. */
export function istParts(ms: number) {
  const d = new Date(ms + IST);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: (d.getUTCDay() + 6) % 7,
  };
}

export const dayKey = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);

/** Midnight IST at the start of the day. */
export const dayStart = (key: string) => Date.parse(`${key}T00:00:00Z`) - IST;

export const addDays = (key: string, n: number) => dayKey(dayStart(key) + n * DAY + DAY / 2);

/** Whole days from a to b (b later is positive). */
export const daysBetween = (a: string, b: string) => Math.round((dayStart(b) - dayStart(a)) / DAY);

export const weekdayOf = (key: string) => istParts(dayStart(key) + DAY / 2).weekday;

export const monthKey = (key: string) => key.slice(0, 7);

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" → "Oct 2026"; short: "Oct". */
export function monthLabel(month: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

/** "2026-10-22" → "22 Oct 2026" (or "22 Oct" without the year). */
export function dayLabel(key: string, withYear = true) {
  const [y, m, d] = key.split("-").map(Number);
  return withYear ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

/** "22 Oct – 28 Oct 2026", or one day. */
export function rangeLabel(from: string, to: string) {
  if (from === to) return dayLabel(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${dayLabel(from, !sameYear)} – ${dayLabel(to)}`;
}

const dayLongFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });

/** "Thu, 22 Oct 2026" (en-IN, IST) */
export const dayLong = (key: string) => dayLongFmt.format(dayStart(key) + DAY / 2);

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});

/** "7:45 pm" */
export const formatTime = (ms: number) => timeFmt.format(ms).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();

/** "22 Oct 2026, 7:45 pm" */
export const formatDateTime = (ms: number) =>
  dateTimeFmt.format(ms).replace(/\s?([ap])\.?m\.?/i, " $1m").replace(/ ([ap]m)$/i, (s) => s.toLowerCase());

/** "just now", "4 min ago", "2 h ago", or the date. */
export function timeAgo(ms: number, now: number) {
  const min = Math.floor((now - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return formatDateTime(ms);
}

/** "1 h 20 min", "35 min". */
export function formatDuration(ms: number) {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 48) return rest ? `${h} h ${rest} min` : `${h} h`;
  return `${Math.round(h / 24)} days`;
}

export const money = formatPrice;

const inrShort = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** Axis labels: ₹950, ₹12.5K, ₹3.4L, ₹1.2Cr. */
export function moneyShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${inrShort.format(n / 1e7)}Cr`;
  if (a >= 1e5) return `₹${inrShort.format(n / 1e5)}L`;
  if (a >= 1e3) return `₹${inrShort.format(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
}

const intFmt = new Intl.NumberFormat("en-IN");
export const count = (n: number) => intFmt.format(Math.round(n));

/** Change from prev to cur as a signed percentage, or null when there is nothing to compare. */
export function change(cur: number, prev: number | null | undefined) {
  if (prev === null || prev === undefined || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

export const percent = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
