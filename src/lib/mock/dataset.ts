/**
 * MOCK, replace with real backend. The demo's year of detailed orders.
 *
 * Every day is generated from a seed made of its date, so the same day always
 * has the same orders, ids and notes, on every device and in every PDF. Only
 * per-day totals are kept in memory; a day's orders are rebuilt when a page of
 * the orders list needs them. The live demo orders (src/lib/api.ts) are added
 * on top, through the same totals code, so every screen reconciles.
 *
 * Loaded only by the owner pages (dynamic import in api.ts).
 */
import menuJson from "@/data/menu.json";
import { demo } from "@/config/demo";
import { choiceDetail, isOrderable, isVegChoice, unitPrice, type Selection } from "../cart";
import type { Menu, MenuItem } from "../data";
import type { Order, OrderLine, OrderStatus } from "../api";
import { addDays, DAY, dayKey, dayStart, daysBetween, istParts, monthKey, weekdayOf } from "../fmt";
import { bestPrice } from "../pricing";
import { CAMPAIGNS } from "./campaigns";
import { hash, pickWeighted, seeded, seededOrderId } from "./random";

export type Ctx = { today: string; now: number; liveOrders: Order[] };

export type SalesKpis = {
  /** Paid total of served orders, after discounts, before taxes. */
  sales: number;
  /** Served orders. */
  orders: number;
  avgBill: number;
  discount: number;
  /** Menu value of served orders before discounts. */
  gross: number;
  /** Every order placed, whatever happened to it. */
  placed: number;
};
export type DayPoint = { key: string; sales: number; orders: number; discount: number };
export type DishStat = { id: string; name: string; category: string; categoryName: string; qty: number; revenue: number };
export type MonthRow = { month: string; sales: number; orders: number; avgBill: number; bestDish: string | null; growth: number | null; partial: boolean };
export type SalesReport = {
  from: string;
  to: string;
  days: number;
  windowStart: string;
  kpis: SalesKpis;
  prev: SalesKpis | null;
  prevRange: { from: string; to: string } | null;
  daily: DayPoint[];
  prevDaily: DayPoint[] | null;
  /** Every dish on the printed menu plus any sold in the range, most sold first. */
  dishes: DishStat[];
  categories: { id: string; name: string; revenue: number; qty: number }[];
  /** Orders placed, [weekday 0 = Monday][hour 0–23]. */
  heat: number[][];
  weekdays: { weekday: number; sales: number; orders: number; days: number }[];
  tables: { table: number; sales: number; orders: number; sessions: number; avgSessionMin: number }[];
  outcomes: { served: number; declined: number; cancelled: number; blocked: number; open: number };
  months: MonthRow[];
  notes: { note: string; count: number }[];
};
export type Timeline = { start: string; end: string; days: DayPoint[] };
export type OrderQuery = {
  from?: string;
  to?: string;
  status?: OrderStatus | "all";
  table?: number | null;
  q?: string;
  page: number;
  pageSize: number;
};
export type OrderPage = { total: number; sales: number; rows: Order[]; page: number; pageSize: number; from: string; to: string };

// --- Menu model --------------------------------------------------------------

const menu = menuJson as unknown as Menu;
const categoryName = new Map(menu.categories.map((c) => [c.id, c.tab]));
const DISHES = menu.items.filter(isOrderable);

const COURSES = {
  starter: ["soups", "tandoor", "chinese", "continentals", "salads"],
  main: ["mains-veg", "mains-nonveg", "dal", "rice", "noodles", "pasta", "pizzeria", "sandwiches"],
  bread: ["breads"],
  side: ["sides"],
  dessert: ["desserts"],
  drink: ["refreshers", "creamery"],
} as const;
type Course = keyof typeof COURSES;

/** The demo's best sellers and slow dishes. */
const FAVOURITES: Record<string, number> = {
  "hazratgunj-murg-dum-biryani": 16,
  "signature-paneer-makkhan-wala": 14,
  "signature-murg-makkhan-wala": 13,
  "dal-makkhan-wali": 12,
  "naan-naan": 14,
  "choice-of-roti": 12,
  "murg-angara": 10,
  "paneer-tikka": 10,
  "schezwan-noodles": 9,
  "gulaab-jaamun-with-rabri": 10,
  "cold-coffee": 9,
  "supreme-veg-manchow": 7,
  "veg-momos": 8,
  "hazratgunj-subz-biryani": 8,
};
const SLOW = new Set([
  "lemon-coriander-chicken",
  "cream-of-mushroom",
  "paneer-kaleji",
  "aloo-chutney-wala",
  "pineapple-raita",
  "moong-di-dal-da-halwa",
  "gosht-laal-maas",
  "craft-your-own-pasta",
]);

function weightOf(item: MenuItem) {
  if (FAVOURITES[item.id]) return FAVOURITES[item.id];
  if (SLOW.has(item.id)) return 0.12;
  const r = seeded(hash(`w:${item.id}`))();
  if (item.tags.includes("bestseller") || item.tags.includes("signature")) return 5 + r * 3;
  return 0.8 + r * 2.6;
}

type Pool = { items: MenuItem[]; weights: number[]; total: number };
function pool(course: Course, vegOnly: boolean): Pool {
  const cats = COURSES[course] as readonly string[];
  const items = DISHES.filter((i) => cats.includes(i.category) && (!vegOnly || i.veg || i.variants?.some((v) => v.veg)));
  const weights = items.map(weightOf);
  return { items, weights, total: weights.reduce((a, b) => a + b, 0) };
}
const POOLS = {
  any: Object.fromEntries((Object.keys(COURSES) as Course[]).map((c) => [c, pool(c, false)])) as Record<Course, Pool>,
  veg: Object.fromEntries((Object.keys(COURSES) as Course[]).map((c) => [c, pool(c, true)])) as Record<Course, Pool>,
};

const NOTES: Record<string, string[]> = {
  starter: ["Less spicy", "Extra spicy", "Serve first, please", "No onion, no garlic", "Well done"],
  main: ["Less spicy", "Medium spicy", "Less oil", "No onion, no garlic", "Extra spicy", "Make it mild for kids", "No coriander"],
  bread: ["Extra butter", "Without butter", "Crispy, please", "Serve hot, one by one"],
  side: ["Less salt", "Extra chutney"],
  dessert: ["Serve after the mains", "Serve warm", "Less sugar"],
  drink: ["No ice", "Less sugar", "Less ice", "Serve with the food"],
};
const DECLINE_REASONS = ["Item out of stock", "Item out of stock", "Item out of stock", "Kitchen closing", "Duplicate order"];

// --- Calendar ----------------------------------------------------------------

/** Festival and holiday effects (approximate dates, demo only). Below 1 = quieter. */
const FESTIVALS: Record<string, number> = {
  "2025-10-02": 1.4, // Dussehra
  "2025-10-18": 1.35, // Dhanteras
  "2025-10-19": 1.3,
  "2025-10-20": 0.7, // Diwali: families eat at home
  "2025-10-23": 1.3, // Bhai Dooj
  "2025-12-24": 1.3,
  "2025-12-25": 1.5, // Christmas
  "2025-12-31": 1.75, // New Year's Eve
  "2026-01-01": 1.45,
  "2026-01-26": 1.3, // Republic Day
  "2026-02-14": 1.55, // Valentine's Day
  "2026-03-03": 0.85,
  "2026-03-04": 0.55, // Holi
  "2026-03-05": 1.3,
  "2026-03-21": 1.35, // Eid
  "2026-08-15": 1.35, // Independence Day
  "2026-08-28": 1.45, // Raksha Bandhan
  "2026-10-20": 1.4, // Dussehra
};
const WEEKDAY = [0.88, 0.86, 0.9, 0.95, 1.06, 1.24, 1.3];
const MONTH = [1.04, 1.06, 0.98, 0.95, 0.92, 0.92, 0.94, 0.97, 0.98, 1.03, 1.07, 1.08];
/** Relative chance of a table being seated in each hour from 11 am (index 0) to 10 pm. */
const HOURS_WEEKDAY = [2, 6, 9, 7, 3, 2, 2, 3, 6, 10, 9, 4];
const HOURS_WEEKEND = [3, 7, 10, 9, 5, 3, 3, 4, 7, 11, 10, 5];
/** Tables near the windows fill first. */
const TABLE_WEIGHTS = Array.from({ length: demo.tableCount }, (_, i) => (i < 4 ? 1.35 : i >= demo.tableCount - 2 ? 0.7 : 1));

export function windowStart(today: string) {
  const [y, m, d] = today.split("-").map(Number);
  return addDays(dayKey(Date.UTC(y - 1, m - 1, d, 6)), 1);
}

const isoDays = (from: string, to: string) => {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
};

// --- Day generator -----------------------------------------------------------

type GenSession = { table: number; start: number; minutes: number };
type GenDay = { orders: Order[]; sessions: GenSession[] };

function pickSelection(item: MenuItem, r: () => number): Selection {
  const s: Selection = {};
  for (const g of item.options ?? []) {
    if (g.required) s[g.id] = g.choices[Math.floor(r() * g.choices.length)].label;
    else s[g.id] = r() < 0.12 ? g.choices[Math.floor(r() * g.choices.length)].label : null;
  }
  return s;
}

function makeLine(item: MenuItem, qty: number, vegOnly: boolean, course: Course, key: string, r: () => number): OrderLine {
  let variantId: string | null = null;
  if (item.variants?.length) {
    const vs = vegOnly ? item.variants.filter((v) => v.veg) : item.variants;
    variantId = (r() < 0.6 ? vs[0] : vs[Math.floor(r() * vs.length)]).id;
  }
  const selection = pickSelection(item, r);
  const list = unitPrice(item, variantId, selection);
  const price = bestPrice(list, item.id, item.category, CAMPAIGNS, key);
  const notes = NOTES[course];
  return {
    itemId: item.id,
    name: item.name,
    detail: choiceDetail(item, variantId, selection),
    note: r() < 0.09 ? notes[Math.floor(r() * notes.length)] : "",
    qty,
    unitPrice: price.unit,
    listPrice: list,
    veg: isVegChoice(item, variantId, selection),
    category: item.category,
  };
}

function pickDish(course: Course, vegOnly: boolean, r: () => number) {
  const p = (vegOnly ? POOLS.veg : POOLS.any)[course];
  return p.items[pickWeighted(r, p.weights, p.total)];
}

function orderLines(first: boolean, party: number, vegOnly: boolean, key: string, r: () => number): OrderLine[] {
  const lines: OrderLine[] = [];
  const add = (course: Course, qty: number) => {
    const item = pickDish(course, vegOnly, r);
    const same = lines.find((l) => l.itemId === item.id && !l.detail);
    if (same && !item.variants && !item.options) same.qty += qty;
    else lines.push(makeLine(item, qty, vegOnly, course, key, r));
  };
  if (first) {
    if (r() < 0.7) add("starter", 1);
    if (r() < 0.25 && party > 3) add("starter", 1);
    const mains = 1 + (party > 3 ? 1 : 0) + (r() < 0.3 ? 1 : 0);
    for (let i = 0; i < mains; i++) add("main", 1);
    if (r() < 0.85) add("bread", Math.max(2, Math.round(party * (0.8 + r() * 0.6))));
    if (r() < 0.3) add("side", 1);
    if (r() < 0.4) add("drink", Math.max(1, Math.round(party * r())));
  } else {
    if (r() < 0.5) add("bread", 2 + Math.floor(r() * 2));
    if (r() < 0.45) add("dessert", 1 + Math.floor(r() * 2));
    if (r() < 0.35) add("drink", 1 + Math.floor(r() * 2));
    if (r() < 0.2 || lines.length === 0) add("main", 1);
  }
  return lines;
}

function dailyTarget(key: string, r: () => number) {
  const growth = 0.88 + 0.26 * Math.min(1.2, Math.max(0, daysBetween("2025-09-01", key) / 400));
  const { weekday, month } = istParts(dayStart(key) + DAY / 2);
  return Math.round(104 * growth * WEEKDAY[weekday] * MONTH[month - 1] * (FESTIVALS[key] ?? 1) * (0.92 + 0.16 * r()));
}

function generateDay(key: string): GenDay {
  const r = seeded(hash(`hg-day:${key}`));
  const target = dailyTarget(key, r);
  const base = dayStart(key);
  const weekend = weekdayOf(key) >= 5;
  const hours = weekend ? HOURS_WEEKEND : HOURS_WEEKDAY;
  const orders: Order[] = [];
  const sessions: GenSession[] = [];
  const min = 60_000;
  let n = 0;
  while (orders.length < target) {
    const table = pickWeighted(r, TABLE_WEIGHTS) + 1;
    const hour = 11 + pickWeighted(r, hours);
    // Last tables are seated by 10:30 pm; the kitchen closes at 11 pm.
    const start = base + hour * 3_600_000 + Math.floor(r() * (hour === 22 ? 30 : 60)) * min;
    const count = r() < 0.52 ? 1 : r() < 0.78 ? 2 : 3;
    const minutes = Math.round(35 + r() * 55 + (count - 1) * 12);
    const party = 2 + Math.floor(r() * 5);
    const vegOnly = r() < 0.5;
    const sessionId = `SH${key.replaceAll("-", "")}${n}`;
    const deviceId = `DH${hash(sessionId).toString(36)}`;
    sessions.push({ table, start, minutes });
    let at = start + (3 + Math.floor(r() * 6)) * min;
    for (let i = 0; i < count; i++) {
      if (i > 0 && at > base + 23 * 3_600_000) break;
      const lines = orderLines(i === 0, party, vegOnly, key, r);
      const subtotal = lines.reduce((s, l) => s + l.listPrice * l.qty, 0);
      const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
      const roll = r();
      const status: OrderStatus = roll < 0.004 ? "declined" : roll < 0.028 ? "declined" : roll < 0.043 ? "cancelled" : "served";
      const accepted = at + (1 + Math.floor(r() * 4)) * min;
      const order: Order = {
        id: seededOrderId(r),
        table,
        sessionId,
        deviceId,
        placedAt: at,
        status,
        lines,
        subtotal,
        discount: subtotal - total,
        total,
        live: false,
        handledBy: ["Amit Verma", "Pooja Singh", "Sanjay Yadav"][Math.floor(r() * 3)],
      };
      if (status === "served") {
        order.acceptedAt = accepted;
        order.servedAt = accepted + (10 + Math.floor(r() * 20)) * min;
      } else if (status === "declined") {
        order.declinedAt = at + (1 + Math.floor(r() * 3)) * min;
        if (roll < 0.004) {
          order.blockedGuest = true;
          order.reason = "Guest blocked";
        } else order.reason = DECLINE_REASONS[Math.floor(r() * DECLINE_REASONS.length)];
      } else {
        order.reason = "Cancelled at the guest's request";
        order.declinedAt = at + (2 + Math.floor(r() * 5)) * min;
      }
      orders.push(order);
      at += (15 + Math.floor(r() * 20)) * min;
    }
    n++;
  }
  orders.sort((a, b) => a.placedAt - b.placedAt);
  return { orders, sessions };
}

/** Generated orders cut at "now" for today: only what had happened by then. */
const genCache = new Map<string, GenDay>();
function genDay(key: string, ctx: Ctx): GenDay {
  if (key > ctx.today) return { orders: [], sessions: [] };
  let g = genCache.get(key);
  if (!g) {
    g = generateDay(key);
    genCache.set(key, g);
    if (genCache.size > 45) genCache.delete(genCache.keys().next().value!);
  }
  if (key < ctx.today) return g;
  const cutoff = ctx.now - 25 * 60_000;
  return {
    orders: g.orders.filter((o) => o.placedAt <= cutoff),
    sessions: g.sessions.filter((s) => s.start + s.minutes * 60_000 <= ctx.now),
  };
}

// --- Totals ------------------------------------------------------------------

const STATUSES: OrderStatus[] = ["received", "preparing", "served", "declined", "cancelled"];
const T = demo.tableCount + 1;

type Agg = {
  placed: number;
  served: number;
  declined: number;
  cancelled: number;
  blocked: number;
  open: number;
  sales: number;
  gross: number;
  discount: number;
  hours: number[];
  dishes: Map<string, { qty: number; revenue: number; name: string; category: string }>;
  cats: Map<string, { revenue: number; qty: number }>;
  tableSales: number[];
  tableOrders: number[];
  tableSessions: number[];
  tableMinutes: number[];
  /** Orders per table and status: [table * 5 + status index]. */
  tableStatus: number[];
  notes: Map<string, number>;
};

const emptyAgg = (): Agg => ({
  placed: 0,
  served: 0,
  declined: 0,
  cancelled: 0,
  blocked: 0,
  open: 0,
  sales: 0,
  gross: 0,
  discount: 0,
  hours: new Array(24).fill(0),
  dishes: new Map(),
  cats: new Map(),
  tableSales: new Array(T).fill(0),
  tableOrders: new Array(T).fill(0),
  tableSessions: new Array(T).fill(0),
  tableMinutes: new Array(T).fill(0),
  tableStatus: new Array(T * 5).fill(0),
  notes: new Map(),
});

function addOrders(a: Agg, orders: Order[], sessions: GenSession[]) {
  for (const o of orders) {
    a.placed++;
    a.hours[istParts(o.placedAt).hour]++;
    const t = Math.min(o.table, T - 1);
    a.tableStatus[t * 5 + STATUSES.indexOf(o.status)]++;
    for (const l of o.lines) if (l.note) a.notes.set(l.note, (a.notes.get(l.note) ?? 0) + 1);
    if (o.status === "received" || o.status === "preparing") a.open++;
    else if (o.status === "cancelled") a.cancelled++;
    else if (o.status === "declined") {
      if (o.blockedGuest) a.blocked++;
      else a.declined++;
    }
    if (o.status !== "served") continue;
    a.served++;
    a.sales += o.total;
    a.gross += o.subtotal;
    a.discount += o.discount;
    a.tableSales[t] += o.total;
    a.tableOrders[t]++;
    for (const l of o.lines) {
      const rev = l.unitPrice * l.qty;
      const d = a.dishes.get(l.itemId);
      if (d) {
        d.qty += l.qty;
        d.revenue += rev;
      } else a.dishes.set(l.itemId, { qty: l.qty, revenue: rev, name: l.name, category: l.category });
      const c = a.cats.get(l.category);
      if (c) {
        c.revenue += rev;
        c.qty += l.qty;
      } else a.cats.set(l.category, { revenue: rev, qty: l.qty });
    }
  }
  for (const s of sessions) {
    a.tableSessions[s.table]++;
    a.tableMinutes[s.table] += s.minutes;
  }
}

function merge(into: Agg, a: Agg) {
  into.placed += a.placed;
  into.served += a.served;
  into.declined += a.declined;
  into.cancelled += a.cancelled;
  into.blocked += a.blocked;
  into.open += a.open;
  into.sales += a.sales;
  into.gross += a.gross;
  into.discount += a.discount;
  for (let i = 0; i < 24; i++) into.hours[i] += a.hours[i];
  for (let i = 0; i < T; i++) {
    into.tableSales[i] += a.tableSales[i];
    into.tableOrders[i] += a.tableOrders[i];
    into.tableSessions[i] += a.tableSessions[i];
    into.tableMinutes[i] += a.tableMinutes[i];
  }
  for (let i = 0; i < T * 5; i++) into.tableStatus[i] += a.tableStatus[i];
  a.dishes.forEach((d, id) => {
    const x = into.dishes.get(id);
    if (x) {
      x.qty += d.qty;
      x.revenue += d.revenue;
    } else into.dishes.set(id, { ...d });
  });
  a.cats.forEach((c, id) => {
    const x = into.cats.get(id);
    if (x) {
      x.revenue += c.revenue;
      x.qty += c.qty;
    } else into.cats.set(id, { ...c });
  });
  a.notes.forEach((n, note) => into.notes.set(note, (into.notes.get(note) ?? 0) + n));
}

const aggCache = new Map<string, Agg>();

function liveByDay(ctx: Ctx) {
  const m = new Map<string, Order[]>();
  for (const o of ctx.liveOrders) {
    const k = dayKey(o.placedAt);
    const list = m.get(k);
    if (list) list.push(o);
    else m.set(k, [o]);
  }
  return m;
}

/** Totals for one day: the generated orders (cached for past days) plus the live demo orders. */
function dayAgg(key: string, ctx: Ctx, live: Map<string, Order[]>): Agg {
  let gen = key < ctx.today ? aggCache.get(key) : undefined;
  if (!gen) {
    gen = emptyAgg();
    const g = genDay(key, ctx);
    addOrders(gen, g.orders, g.sessions);
    if (key < ctx.today) aggCache.set(key, gen);
  }
  const extra = live.get(key);
  if (!extra) return gen;
  const a = emptyAgg();
  merge(a, gen);
  addOrders(a, extra, []);
  return a;
}

const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

/** Builds missing day totals in small batches, so the page stays responsive. */
async function warm(keys: string[], ctx: Ctx) {
  let built = 0;
  for (const k of keys) {
    if (k >= ctx.today || aggCache.has(k)) continue;
    dayAgg(k, ctx, new Map());
    if (++built % 15 === 0) await yieldToUi();
  }
}

function clampRange(ctx: Ctx, from: string, to: string) {
  const start = windowStart(ctx.today);
  const f = from < start ? start : from > ctx.today ? ctx.today : from;
  const t = to > ctx.today ? ctx.today : to < f ? f : to;
  return { from: f, to: t, start };
}

const kpisOf = (a: Agg): SalesKpis => ({
  sales: a.sales,
  orders: a.served,
  avgBill: a.served ? a.sales / a.served : 0,
  discount: a.discount,
  gross: a.gross,
  placed: a.placed,
});

const pointOf = (key: string, a: Agg): DayPoint => ({ key, sales: a.sales, orders: a.served, discount: a.discount });

export async function timeline(ctx: Ctx): Promise<Timeline> {
  const start = windowStart(ctx.today);
  const keys = isoDays(start, ctx.today);
  await warm(keys, ctx);
  const live = liveByDay(ctx);
  return { start, end: ctx.today, days: keys.map((k) => pointOf(k, dayAgg(k, ctx, live))) };
}

export async function report(ctx: Ctx, fromKey: string, toKey: string, compare: boolean): Promise<SalesReport> {
  const { from, to, start } = clampRange(ctx, fromKey, toKey);
  const keys = isoDays(from, to);
  const days = keys.length;
  const prevRange = compare ? { from: addDays(from, -days), to: addDays(from, -1) } : null;
  const prevOk = !!prevRange && prevRange.from >= start;
  await warm(prevOk ? [...isoDays(prevRange!.from, prevRange!.to), ...keys] : keys, ctx);
  const live = liveByDay(ctx);

  const total = emptyAgg();
  const daily: DayPoint[] = [];
  const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ weekday, sales: 0, orders: 0, days: 0 }));
  const monthAggs = new Map<string, { agg: Agg; days: number }>();
  for (const k of keys) {
    const a = dayAgg(k, ctx, live);
    merge(total, a);
    daily.push(pointOf(k, a));
    const wd = weekdayOf(k);
    for (let h = 0; h < 24; h++) heat[wd][h] += a.hours[h];
    weekdays[wd].sales += a.sales;
    weekdays[wd].orders += a.served;
    weekdays[wd].days++;
    const mk = monthKey(k);
    let m = monthAggs.get(mk);
    if (!m) monthAggs.set(mk, (m = { agg: emptyAgg(), days: 0 }));
    merge(m.agg, a);
    m.days++;
  }

  let prev: SalesKpis | null = null;
  let prevDaily: DayPoint[] | null = null;
  if (prevOk) {
    const p = emptyAgg();
    prevDaily = isoDays(prevRange!.from, prevRange!.to).map((k) => {
      const a = dayAgg(k, ctx, live);
      merge(p, a);
      return pointOf(k, a);
    });
    prev = kpisOf(p);
  }

  const seen = new Set<string>();
  const dishes: DishStat[] = [];
  total.dishes.forEach((d, id) => {
    seen.add(id);
    dishes.push({ id, name: d.name, category: d.category, categoryName: categoryName.get(d.category) ?? d.category, qty: d.qty, revenue: d.revenue });
  });
  for (const i of DISHES)
    if (!seen.has(i.id)) dishes.push({ id: i.id, name: i.name, category: i.category, categoryName: categoryName.get(i.category) ?? i.category, qty: 0, revenue: 0 });
  dishes.sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

  const categories = [...total.cats.entries()]
    .map(([id, c]) => ({ id, name: categoryName.get(id) ?? id, revenue: c.revenue, qty: c.qty }))
    .sort((a, b) => b.revenue - a.revenue);

  const tables = Array.from({ length: demo.tableCount }, (_, i) => {
    const t = i + 1;
    return {
      table: t,
      sales: total.tableSales[t],
      orders: total.tableOrders[t],
      sessions: total.tableSessions[t],
      avgSessionMin: total.tableSessions[t] ? total.tableMinutes[t] / total.tableSessions[t] : 0,
    };
  });

  const monthKeys = [...monthAggs.keys()].sort();
  const months: MonthRow[] = monthKeys.map((mk, i) => {
    const { agg, days: covered } = monthAggs.get(mk)!;
    const [y, m] = mk.split("-").map(Number);
    const inMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let best: string | null = null;
    let bestQty = 0;
    agg.dishes.forEach((d) => {
      if (d.qty > bestQty) {
        bestQty = d.qty;
        best = d.name;
      }
    });
    const prevSales = i > 0 ? monthAggs.get(monthKeys[i - 1])!.agg.sales : null;
    return {
      month: mk,
      sales: agg.sales,
      orders: agg.served,
      avgBill: agg.served ? agg.sales / agg.served : 0,
      bestDish: best,
      growth: prevSales ? ((agg.sales - prevSales) / prevSales) * 100 : null,
      partial: covered < inMonth,
    };
  });

  const notes = [...total.notes.entries()]
    .map(([note, count]) => ({ note, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    from,
    to,
    days,
    windowStart: start,
    kpis: kpisOf(total),
    prev,
    prevRange: prevOk ? prevRange : null,
    daily,
    prevDaily,
    dishes,
    categories,
    heat,
    weekdays,
    tables,
    outcomes: { served: total.served, declined: total.declined, cancelled: total.cancelled, blocked: total.blocked, open: total.open },
    months,
    notes,
  };
}

// --- Orders list -------------------------------------------------------------

function dayOrders(key: string, ctx: Ctx, live: Map<string, Order[]>) {
  const list = [...genDay(key, ctx).orders, ...(live.get(key) ?? [])];
  return list.sort((a, b) => b.placedAt - a.placedAt);
}

function matcher(q: OrderQuery) {
  const needle = q.q?.trim().toLowerCase() ?? "";
  return (o: Order) =>
    (!q.status || q.status === "all" || o.status === q.status) &&
    (!q.table || o.table === q.table) &&
    (!needle ||
      o.id.toLowerCase().includes(needle) ||
      `table ${o.table}` === needle ||
      o.lines.some((l) => l.name.toLowerCase().includes(needle) || l.note.toLowerCase().includes(needle)));
}

const searchCache = new Map<string, Map<string, { count: number; sales: number }>>();

/** Matches per day: from the totals when there is no text search, else by scanning the day. */
function dayMatches(key: string, q: OrderQuery, ctx: Ctx, live: Map<string, Order[]>) {
  if (!q.q?.trim()) {
    const a = dayAgg(key, ctx, live);
    const tables = q.table ? [q.table] : Array.from({ length: T }, (_, i) => i);
    const statuses = !q.status || q.status === "all" ? STATUSES.map((_, i) => i) : [STATUSES.indexOf(q.status)];
    let count = 0;
    for (const t of tables) for (const s of statuses) count += a.tableStatus[t * 5 + s];
    const servedIncluded = !q.status || q.status === "all" || q.status === "served";
    const sales = servedIncluded ? (q.table ? a.tableSales[q.table] : a.sales) : 0;
    return { count, sales };
  }
  const cacheKey = JSON.stringify([q.q, q.status, q.table, key === ctx.today ? ctx.now : 0, live.get(key)?.length ?? 0]);
  let byDay = searchCache.get(cacheKey);
  if (!byDay) {
    if (searchCache.size > 20) searchCache.clear();
    searchCache.set(cacheKey, (byDay = new Map()));
  }
  const hit = byDay.get(key);
  if (hit) return hit;
  const match = matcher(q);
  let count = 0;
  let sales = 0;
  for (const o of dayOrders(key, ctx, live))
    if (match(o)) {
      count++;
      if (o.status === "served") sales += o.total;
    }
  const r = { count, sales };
  byDay.set(key, r);
  return r;
}

export async function queryOrders(ctx: Ctx, q: OrderQuery): Promise<OrderPage> {
  const { from, to } = clampRange(ctx, q.from ?? windowStart(ctx.today), q.to ?? ctx.today);
  const keys = isoDays(from, to).reverse();
  await warm(keys, ctx);
  const live = liveByDay(ctx);
  const counts: number[] = [];
  let total = 0;
  let sales = 0;
  for (let i = 0; i < keys.length; i++) {
    const m = dayMatches(keys[i], q, ctx, live);
    counts.push(m.count);
    total += m.count;
    sales += m.sales;
    if (q.q && i % 20 === 19) await yieldToUi();
  }
  const offset = q.page * q.pageSize;
  const rows: Order[] = [];
  let skipped = 0;
  const match = matcher(q);
  for (let i = 0; i < keys.length && rows.length < q.pageSize; i++) {
    if (skipped + counts[i] <= offset) {
      skipped += counts[i];
      continue;
    }
    const list = dayOrders(keys[i], ctx, live).filter(match);
    for (const o of list) {
      if (skipped < offset) {
        skipped++;
        continue;
      }
      rows.push(o);
      if (rows.length >= q.pageSize) break;
    }
  }
  return { total, sales, rows, page: q.page, pageSize: q.pageSize, from, to };
}
