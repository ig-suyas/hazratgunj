/**
 * The data layer. Every screen (guest menu, staff screen, owner dashboard)
 * calls only this module. Today it is a MOCK backend that runs in the browser:
 * live state in localStorage (shared between tabs with BroadcastChannel) and a
 * seeded one-year dataset generated in memory.
 *
 * MOCK, replace with real backend: keep these function names and types, and
 * swap the bodies for HTTP calls. Everything below that checks a role, a PIN,
 * a price, a block or a rate limit must be done again on the server; the
 * browser checks here only make the demo behave like the real thing.
 */
import menuJson from "@/data/menu.json";
import { demo } from "@/config/demo";
import { choiceDetail, isOrderable, isVegChoice, unitPrice, type Selection } from "./cart";
import type { Menu, MenuItem } from "./data";
import { addDays, DAY, dayKey, daysBetween } from "./fmt";
import { CAMPAIGNS } from "./mock/campaigns";
import { hash, newOrderId, newPin, pinHash, randomId, seeded } from "./mock/random";
import * as store from "./mock/store";
import { bestPrice, discountRunning, type Discount } from "./pricing";

export type { Category, Menu, MenuItem } from "./data";
export type { Discount, DiscountTarget } from "./pricing";
export type {
  DayPoint,
  DishStat,
  MonthRow,
  OrderQuery,
  OrderPage,
  SalesKpis,
  SalesReport,
  Timeline,
} from "./mock/dataset";

// --- Types -------------------------------------------------------------------

export type Role = "staff" | "owner";

export type Account = { id: string; name: string; username: string; role: Role; createdAt: number };
type AccountRecord = Account & { pinHash: string };

export type AuthUser = Account & { expiresAt: number };

export type TableInfo = { number: number; token: string };

export type GuestSession = {
  id: string;
  deviceId: string;
  table: number;
  token: string;
  startedAt: number;
  expiresAt: number;
  lastOrderAt?: number;
  endedAt?: number;
  endedBy?: string;
  endReason?: "cleared" | "blocked";
};

/** What the guest menu may do. "unavailable" never says why (blocked, or the subscription lapsed). */
export type GuestState =
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "unavailable" }
  | { kind: "active"; sessionId: string; table: number; expiresAt: number };

export type OrderStatus = "received" | "preparing" | "served" | "declined" | "cancelled";

export type OrderLine = {
  itemId: string;
  name: string;
  /** Variant and choices, e.g. "Chicken · Penne". */
  detail: string;
  note: string;
  qty: number;
  /** Price paid per unit, after any discount. */
  unitPrice: number;
  /** Menu price per unit. */
  listPrice: number;
  veg: boolean;
  /** Category as stored in the menu data. */
  category: string;
};

export type Order = {
  id: string;
  table: number;
  sessionId: string;
  deviceId: string;
  placedAt: number;
  status: OrderStatus;
  lines: OrderLine[];
  /** Before discounts. */
  subtotal: number;
  discount: number;
  total: number;
  acceptedAt?: number;
  servedAt?: number;
  declinedAt?: number;
  reason?: string;
  handledBy?: string;
  /** Declined automatically because the guest was blocked. */
  blockedGuest?: boolean;
  /** Set on orders made by the demo controls. */
  demo?: "simulated" | "from-home";
  /** False for orders from the historical demo dataset. */
  live: boolean;
};

export type CartInput = { itemId: string; variantId: string | null; selection: Selection; note: string; qty: number };

export type BlockReason = "not-here" | "prank" | "other";
export type BlockDuration = "1h" | "24h" | "7d" | "until";
export type BlockStatus = "active" | "expired" | "unblocked";

export const BLOCK_REASONS: Record<BlockReason, string> = {
  "not-here": "Not at the restaurant",
  prank: "Prank or spam",
  other: "Other",
};
export const BLOCK_DURATIONS: Record<BlockDuration, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  until: "Until unblocked",
};
const DURATION_MS: Record<BlockDuration, number | null> = { "1h": 3_600_000, "24h": DAY, "7d": 7 * DAY, until: null };

export type Block = {
  id: string;
  sessionId: string;
  deviceId: string;
  table: number;
  orderId: string | null;
  /** "2 × Paneer Tikka, 1 × Butter Naan" */
  orderSummary: string | null;
  reason: BlockReason;
  note?: string;
  duration: BlockDuration;
  blockedAt: number;
  expiresAt: number | null;
  blockedBy: string;
  unblockedAt?: number;
  unblockedBy?: string;
  unblockNote?: string;
};

export type BlockRow = Block & { status: BlockStatus };

export type BlockEvent = {
  id: string;
  at: number;
  type: "block" | "unblock" | "expire";
  blockId: string;
  table: number;
  by: string;
  detail: string;
  orderId: string | null;
};

export type Suggestion = {
  id: string;
  name: string;
  category: string;
  veg: boolean;
  price: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  suggestedBy: string;
  suggestedById: string;
  suggestedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  reason?: string;
  itemId?: string;
};

export type LiveItem = MenuItem & { available: boolean; addedOn?: number };
export type LiveMenu = Omit<Menu, "items"> & { items: LiveItem[] };

export type MenuItemEdit = Partial<Pick<MenuItem, "name" | "description" | "price" | "category" | "veg" | "variants">>;

type MenuPatch = {
  edits: Record<string, MenuItemEdit>;
  added: (MenuItem & { addedOn: number })[];
  deleted: string[];
  outOfStock: string[];
  categoryOrder: string[] | null;
};

export type Subscription = {
  endsOn: string;
  /** Days from today to the last day; 0 = the last day, negative = expired. */
  daysLeft: number;
  status: "active" | "due" | "today" | "expired";
};

export type Overview = {
  today: string;
  sales: number;
  orders: number;
  avgBill: number;
  activeTables: number;
  pendingApprovals: number;
  blockedGuests: number;
  openOrders: number;
  latest: Order[];
};

export class ApiError extends Error {
  constructor(
    public code:
      | "invalid"
      | "expired"
      | "unavailable"
      | "rate_limited"
      | "cooldown"
      | "out_of_stock"
      | "forbidden"
      | "not_found"
      | "locked"
      | "bad_input",
    message: string,
  ) {
    super(message);
  }
}

// --- Plumbing ----------------------------------------------------------------

const baseMenu = menuJson as unknown as Menu;
const now = () => Date.now();
const today = () => dayKey(now());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Simulated network time, so loading states are real. */
const READ = 60;
const WRITE = 220;

const SEED_VERSION = 3;

/** Topics a screen can listen to. */
export type Topic = store.Topic;

/** Calls cb whenever demo data changes in this tab or another tab on this device. */
export function subscribe(cb: (topics: Set<string>) => void) {
  return store.subscribe(cb);
}

function deviceId() {
  let id = store.deviceGet<string | null>("id", null);
  if (!id) {
    id = `D${randomId(12)}`;
    store.deviceSet("id", id);
  }
  return id;
}

const sessions = () => store.read<GuestSession[]>("sessions", () => []);
const orders = () => store.read<Order[]>("orders", () => []);
const blocks = () => store.read<Block[]>("blocks", () => []);
const tables = () => store.read<TableInfo[]>("tables", () => []);
const accounts = () => store.read<AccountRecord[]>("staff", () => []);
const discounts = () => store.read<Discount[]>("discounts", () => []);
const suggestions = () => store.read<Suggestion[]>("suggestions", () => []);
const patch = () =>
  store.read<MenuPatch>("menu", () => ({ edits: {}, added: [], deleted: [], outOfStock: [], categoryOrder: null }));
const settings = () => store.read<{ subscriptionEndsOn: string }>("settings", () => ({ subscriptionEndsOn: addDays(today(), 30) }));

let seeding = false;
function boot() {
  if (typeof window === "undefined" || seeding) return;
  const meta = store.read<{ version: number } | null>("meta", () => null);
  if (meta?.version === SEED_VERSION) return;
  seeding = true;
  try {
    seed();
  } finally {
    seeding = false;
  }
}

const cleanAccount = ({ pinHash: _omit, ...a }: AccountRecord): Account => (void _omit, a);

// Sign-in lives on the server: an httpOnly JWT cookie checked by src/proxy.ts
// and /api/auth/me. Real data security arrives with the real backend. The
// demo data itself is still mock.
const inFlight = new Map<string, Promise<AuthUser | null>>();

/** Asks the server who is signed in. With roles, the server answers 403 unless the account has one of them. */
function serverUser(roles?: Role[]): Promise<AuthUser | null> {
  const url = roles ? `/api/auth/me?role=${roles.join(",")}` : "/api/auth/me";
  let p = inFlight.get(url);
  if (!p) {
    p = fetch(url, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ ok: boolean; username: string; role: Role; expiresAt: number }>) : null))
      .then((me) => {
        if (!me?.ok) return null;
        // Name and id come from the demo store; an account missing there still works.
        const acc = accounts().find((a) => a.username === me.username);
        const base = acc ? cleanAccount(acc) : { id: `U-${me.username}`, name: me.username, username: me.username, role: me.role, createdAt: 0 };
        return { ...base, role: me.role, expiresAt: me.expiresAt };
      })
      .catch(() => null)
      .finally(() => inFlight.delete(url));
    inFlight.set(url, p);
  }
  return p;
}

async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await serverUser(roles);
  if (!user) throw new ApiError("forbidden", "Please sign in again.");
  return user;
}

// --- Menu --------------------------------------------------------------------

function buildMenu(): LiveMenu {
  const p = patch();
  const deleted = new Set(p.deleted);
  const oos = new Set(p.outOfStock);
  const items: LiveItem[] = [...baseMenu.items, ...p.added]
    .filter((i) => !deleted.has(i.id))
    .map((i) => ({ ...i, ...p.edits[i.id], available: !oos.has(i.id) }));
  let categories = baseMenu.categories;
  if (p.categoryOrder) {
    const pos = new Map(p.categoryOrder.map((id, i) => [id, i]));
    categories = [...categories].sort((a, b) => (pos.get(a.id) ?? 99) - (pos.get(b.id) ?? 99));
  }
  return { ...baseMenu, categories, items };
}

let menuCache: { src: unknown; menu: LiveMenu } | null = null;
function liveMenu() {
  const src = patch();
  if (menuCache?.src !== src) menuCache = { src, menu: buildMenu() };
  return menuCache.menu;
}

/** The menu with the owner's edits and today's availability. */
export async function getMenu(): Promise<LiveMenu> {
  if (typeof window === "undefined") return { ...baseMenu, items: baseMenu.items.map((i) => ({ ...i, available: true })) };
  boot();
  return liveMenu();
}

/** Discounts running today (shown to guests). */
export async function getActiveDiscounts(): Promise<Discount[]> {
  if (typeof window === "undefined") return [];
  boot();
  const d = today();
  return discounts().filter((x) => discountRunning(x, d));
}

export async function setItemAvailability(itemId: string, available: boolean) {
  boot();
  await requireRole("staff", "owner");
  await wait(WRITE / 2);
  store.update("menu", patch, (p) => ({
    ...p,
    outOfStock: available ? p.outOfStock.filter((id) => id !== itemId) : [...new Set([...p.outOfStock, itemId])],
  }));
}

export async function updateMenuItem(itemId: string, edit: MenuItemEdit) {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  if (edit.price !== undefined && (edit.price === null || edit.price < 0)) throw new ApiError("bad_input", "Enter a price.");
  store.update("menu", patch, (p) => {
    const added = p.added.find((a) => a.id === itemId);
    if (added) return { ...p, added: p.added.map((a) => (a === added ? { ...a, ...edit } : a)) };
    return { ...p, edits: { ...p.edits, [itemId]: { ...p.edits[itemId], ...edit } } };
  });
}

export async function addMenuItem(input: { name: string; category: string; veg: boolean; price: number; description: string }) {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  return addItem(input);
}

function addItem(input: { name: string; category: string; veg: boolean; price: number; description: string }) {
  const name = input.name.trim();
  if (!name || !(input.price > 0)) throw new ApiError("bad_input", "Add a name and a price.");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const item: MenuItem & { addedOn: number } = {
    id: `${slug}-${randomId(4).toLowerCase()}`,
    category: input.category,
    name,
    description: input.description.trim(),
    descriptionSource: "written",
    price: Math.round(input.price),
    veg: input.veg,
    image: null,
    tags: ["new"],
    page: 0,
    addedOn: now(),
  };
  store.update("menu", patch, (p) => ({ ...p, added: [...p.added, item] }));
  return item.id;
}

export async function deleteMenuItem(itemId: string) {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  store.update("menu", patch, (p) =>
    p.added.some((a) => a.id === itemId)
      ? { ...p, added: p.added.filter((a) => a.id !== itemId) }
      : { ...p, deleted: [...new Set([...p.deleted, itemId])] },
  );
}

export async function reorderCategories(ids: string[]) {
  boot();
  await requireRole("owner");
  await wait(WRITE / 2);
  store.update("menu", patch, (p) => ({ ...p, categoryOrder: ids }));
}

// --- Tables, tokens and guest sessions ---------------------------------------

export async function listTables(): Promise<TableInfo[]> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  return tables();
}

function tableForToken(token: string) {
  return tables().find((t) => t.token === token.trim()) ?? null;
}

export async function validateTableToken(token: string): Promise<{ ok: true; table: number } | { ok: false }> {
  boot();
  await wait(READ);
  const t = tableForToken(token);
  return t ? { ok: true, table: t.number } : { ok: false };
}

function subscriptionStatus(): Subscription {
  const endsOn = settings().subscriptionEndsOn;
  const daysLeft = daysBetween(today(), endsOn);
  const status = daysLeft < 0 ? "expired" : daysLeft === 0 ? "today" : daysLeft <= 3 ? "due" : "active";
  return { endsOn, daysLeft, status };
}

/*
 * Blocking works on the session id and the device id. A real backend should
 * also weigh the IP address, the network and rate-limit signals: a device id
 * lives in the browser's storage and is cleared in seconds (private window,
 * clear site data), so on its own it only stops casual misuse.
 */
function activeBlockFor(sessionId: string | null, device: string) {
  const t = now();
  return blocks().find(
    (b) => !b.unblockedAt && (b.expiresAt === null || b.expiresAt > t) && (b.deviceId === device || (sessionId !== null && b.sessionId === sessionId)),
  );
}

function sessionState(s: GuestSession | undefined): GuestState {
  if (!s || s.endedAt || s.expiresAt <= now()) {
    if (s && activeBlockFor(s.id, s.deviceId)) return { kind: "unavailable" };
    return { kind: "expired" };
  }
  if (activeBlockFor(s.id, s.deviceId) || subscriptionStatus().status === "expired") return { kind: "unavailable" };
  return { kind: "active", sessionId: s.id, table: s.table, expiresAt: s.expiresAt };
}

/**
 * Opens (or resumes) this device's session for the table behind a QR token.
 * Called when the guest opens /menu?t=<token>.
 */
export async function createSession(token: string): Promise<GuestState> {
  boot();
  await wait(READ * 2);
  const t = tableForToken(token);
  if (!t) return { kind: "invalid" };
  const device = deviceId();
  if (activeBlockFor(null, device) || subscriptionStatus().status === "expired") return { kind: "unavailable" };

  const ref = store.deviceGet<{ sessionId: string; token: string } | null>("guest", null);
  const existing = ref?.token === t.token ? sessions().find((s) => s.id === ref.sessionId) : undefined;
  const state = sessionState(existing);
  if (state.kind === "active" || state.kind === "unavailable") return state;

  const s: GuestSession = {
    id: `S${randomId(12)}`,
    deviceId: device,
    table: t.number,
    token: t.token,
    startedAt: now(),
    expiresAt: now() + demo.sessionMinutes * 60_000,
  };
  store.update("sessions", sessions, (list) => [...prune(list, (x) => x.endedAt ?? x.expiresAt), s]);
  store.deviceSet("guest", { sessionId: s.id, token: t.token });
  return sessionState(s);
}

/** Current state of a guest session (it can expire, be cleared or be blocked while the menu is open). */
export async function getGuestState(sessionId: string): Promise<GuestState> {
  boot();
  await wait(READ / 2);
  return sessionState(sessions().find((s) => s.id === sessionId));
}

/** This guest's own orders, newest first. */
export async function getGuestOrders(sessionId: string): Promise<Order[]> {
  boot();
  await wait(READ / 2);
  return orders()
    .filter((o) => o.sessionId === sessionId)
    .sort((a, b) => b.placedAt - a.placedAt);
}

/** Drops records older than the retention period. */
function prune<T>(list: T[], at: (x: T) => number) {
  const cutoff = now() - demo.retentionMonths * 31 * DAY;
  return list.filter((x) => at(x) >= cutoff);
}

function priceLines(input: CartInput[]): OrderLine[] {
  const menu = liveMenu();
  const items = new Map(menu.items.map((i) => [i.id, i]));
  const running = discounts();
  const day = today();
  return input.map((l) => {
    const item = items.get(l.itemId);
    if (!item || !isOrderable(item)) throw new ApiError("invalid", "A dish in your order is no longer on the menu.");
    if (!item.available) throw new ApiError("out_of_stock", `${item.name} is not available right now.`);
    const incomplete =
      (item.variants?.length && !item.variants.some((v) => v.id === l.variantId)) ||
      item.options?.some((g) => g.required && !g.choices.some((c) => c.label === l.selection[g.id]));
    if (incomplete) throw new ApiError("bad_input", `Choose the options for ${item.name}.`);
    const list = unitPrice(item, l.variantId, l.selection);
    const price = bestPrice(list, item.id, item.category, running, day);
    return {
      itemId: item.id,
      name: item.name,
      detail: choiceDetail(item, l.variantId, l.selection),
      note: l.note.trim().slice(0, 150),
      qty: Math.max(1, Math.min(99, Math.round(l.qty))),
      unitPrice: price.unit,
      listPrice: list,
      veg: isVegChoice(item, l.variantId, l.selection),
      category: item.category,
    };
  });
}

function totals(lines: OrderLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.listPrice * l.qty, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  return { subtotal, discount: subtotal - total, total };
}

/** Places a guest order. The server re-prices every line; the cart's prices are never trusted. */
export async function placeOrder(input: { sessionId: string; lines: CartInput[]; table?: number }): Promise<Order> {
  boot();
  await wait(WRITE * 2);
  const s = sessions().find((x) => x.id === input.sessionId);
  const state = sessionState(s);
  if (state.kind !== "active" || !s) throw new ApiError(state.kind === "unavailable" ? "unavailable" : "expired", "");
  if (!input.lines.length) throw new ApiError("bad_input", "Your order is empty.");

  // Generous limits: a table ordering round after round is normal; only bursts are stopped.
  const hourAgo = now() - 3_600_000;
  const recent = orders().filter((o) => o.sessionId === s.id && o.placedAt > hourAgo);
  if (recent.some((o) => o.placedAt > now() - demo.orderCooldownSeconds * 1000)) throw new ApiError("cooldown", "");
  if (recent.length >= demo.ordersPerHour) throw new ApiError("rate_limited", "");

  let table = s.table;
  if (demo.tableMode === "ask") {
    if (!input.table || input.table < 1 || input.table > demo.tableCount) throw new ApiError("bad_input", "Enter your table number.");
    table = input.table;
  }
  const lines = priceLines(input.lines);
  const order: Order = {
    id: newOrderId(),
    table,
    sessionId: s.id,
    deviceId: s.deviceId,
    placedAt: now(),
    status: "received",
    lines,
    ...totals(lines),
    live: true,
  };
  store.update("orders", orders, (list) => [...prune(list, (o) => o.placedAt), order]);
  // Every order keeps the session open for another full period.
  store.update("sessions", sessions, (list) =>
    list.map((x) => (x.id === s.id ? { ...x, lastOrderAt: now(), expiresAt: now() + demo.sessionMinutes * 60_000 } : x)),
  );
  return order;
}

// --- Staff: live orders and tables -------------------------------------------

/** A board order with context from its guest session, so staff can judge whether the guest is really at the table. */
export type LiveOrder = Order & {
  /** When the guest session started (null if the session record is gone). */
  sessionStartedAt: number | null;
  /** 1-based position of this order within its session. */
  sessionOrderNo: number;
};

/** Orders still on the staff board: open ones, and those finished in the last 3 hours. */
export async function getLiveOrders(): Promise<LiveOrder[]> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  const since = now() - 3 * 3_600_000;
  const all = orders();
  const started = new Map(sessions().map((s) => [s.id, s.startedAt]));
  return all
    .filter((o) => o.status === "received" || o.status === "preparing" || (o.servedAt ?? o.declinedAt ?? o.placedAt) > since)
    .sort((a, b) => a.placedAt - b.placedAt)
    .map((o) => ({
      ...o,
      sessionStartedAt: started.get(o.sessionId) ?? null,
      sessionOrderNo: all.filter((x) => x.sessionId === o.sessionId && x.placedAt <= o.placedAt).length,
    }));
}

export async function updateOrderStatus(orderId: string, action: "accept" | "reject" | "serve", reason?: string) {
  const [next] = await updateOrdersStatus([orderId], action, reason);
  return next;
}

/**
 * Accepts, rejects or serves whole orders (all their dishes together), e.g. "Accept all" for one table.
 * Orders already moved on (by another device) are skipped.
 */
export async function updateOrdersStatus(orderIds: string[], action: "accept" | "reject" | "serve", reason?: string): Promise<Order[]> {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  const from: OrderStatus = action === "serve" ? "preparing" : "received";
  const ids = new Set(orderIds);
  const due = orders().filter((x) => ids.has(x.id) && x.status === from);
  if (!due.length) throw new ApiError("not_found", orderIds.length === 1 ? "This order was already handled." : "These orders were already handled.");
  const t = now();
  const changed = new Map(
    due.map((o): [string, Order] => [
      o.id,
      action === "accept"
        ? { ...o, status: "preparing", acceptedAt: t, handledBy: user.name }
        : action === "serve"
          ? { ...o, status: "served", servedAt: t, acceptedAt: o.acceptedAt ?? t, handledBy: user.name }
          : { ...o, status: "declined", declinedAt: t, reason: reason?.trim() || "Declined by staff", handledBy: user.name },
    ]),
  );
  store.update("orders", orders, (list) => list.map((x) => changed.get(x.id) ?? x));
  return [...changed.values()];
}

export type TableSession = GuestSession & { orders: Order[]; total: number };

/** Guest sessions open right now, with their orders. */
export async function listActiveSessions(): Promise<TableSession[]> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  const t = now();
  const all = orders();
  return sessions()
    .filter((s) => !s.endedAt && s.expiresAt > t)
    .map((s) => {
      const own = all.filter((o) => o.sessionId === s.id);
      return { ...s, orders: own, total: own.filter((o) => o.status !== "declined").reduce((n, o) => n + o.total, 0) };
    })
    .sort((a, b) => a.table - b.table || a.startedAt - b.startedAt);
}

/** One guest session with its orders (for the block sheet). */
export async function getTableSession(sessionId: string): Promise<TableSession | null> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  const s = sessions().find((x) => x.id === sessionId);
  if (!s) return null;
  const own = orders().filter((o) => o.sessionId === s.id);
  return { ...s, orders: own, total: own.filter((o) => o.status !== "declined").reduce((n, o) => n + o.total, 0) };
}

/** Ends one guest session (the guest then has to scan the QR code again). */
export async function endSession(sessionId: string) {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  store.update("sessions", sessions, (list) =>
    list.map((s) => (s.id === sessionId && !s.endedAt ? { ...s, endedAt: now(), endedBy: user.name, endReason: "cleared" as const } : s)),
  );
}

/** Clear table: ends every open session at the table. */
export async function clearTable(table: number) {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  store.update("sessions", sessions, (list) =>
    list.map((s) => (s.table === table && !s.endedAt ? { ...s, endedAt: now(), endedBy: user.name, endReason: "cleared" as const } : s)),
  );
}

// --- Block and unblock -------------------------------------------------------

const blockStatus = (b: Block, t = now()): BlockStatus =>
  b.unblockedAt ? "unblocked" : b.expiresAt !== null && b.expiresAt <= t ? "expired" : "active";

export const orderSummary = (o: Pick<Order, "lines">) => o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ");

/**
 * Blocks the guest behind a session: the session and its device can no longer
 * order, open orders are declined and the session ends. The guest only ever
 * sees "Ordering is unavailable right now".
 */
export async function blockGuest(input: {
  sessionId: string;
  orderId?: string | null;
  reason: BlockReason;
  note?: string;
  duration: BlockDuration;
}): Promise<Block> {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  const s = sessions().find((x) => x.id === input.sessionId);
  if (!s) throw new ApiError("not_found", "This guest session no longer exists.");
  if (input.reason === "other" && !input.note?.trim()) throw new ApiError("bad_input", "Add a short note.");
  const order = input.orderId ? orders().find((o) => o.id === input.orderId) : undefined;
  const t = now();
  const ms = DURATION_MS[input.duration];
  const block: Block = {
    id: `B${randomId(10)}`,
    sessionId: s.id,
    deviceId: s.deviceId,
    table: s.table,
    orderId: order?.id ?? null,
    orderSummary: order ? orderSummary(order) : null,
    reason: input.reason,
    note: input.note?.trim() || undefined,
    duration: input.duration,
    blockedAt: t,
    expiresAt: ms === null ? null : t + ms,
    blockedBy: user.name,
  };
  store.update("blocks", blocks, (list) => [...prune(list, (b) => b.blockedAt), block]);
  store.update("orders", orders, (list) =>
    list.map((o) =>
      (o.sessionId === s.id || o.deviceId === s.deviceId) && (o.status === "received" || o.status === "preparing")
        ? { ...o, status: "declined" as const, declinedAt: t, reason: "Guest blocked", blockedGuest: true, handledBy: user.name }
        : o,
    ),
  );
  store.update("sessions", sessions, (list) =>
    list.map((x) =>
      (x.id === s.id || x.deviceId === s.deviceId) && !x.endedAt ? { ...x, endedAt: t, endedBy: user.name, endReason: "blocked" as const } : x,
    ),
  );
  return block;
}

export async function unblockGuest(blockId: string, note?: string) {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  store.update("blocks", blocks, (list) =>
    list.map((b) =>
      b.id === blockId && blockStatus(b) === "active"
        ? { ...b, unblockedAt: now(), unblockedBy: user.name, unblockNote: note?.trim() || undefined }
        : b,
    ),
  );
}

export async function listBlockedGuests(filter: { status?: BlockStatus | "all"; q?: string; from?: string; to?: string } = {}): Promise<BlockRow[]> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  const t = now();
  const q = filter.q?.trim().toLowerCase();
  return blocks()
    .map((b) => ({ ...b, status: blockStatus(b, t) }))
    .filter((b) => !filter.status || filter.status === "all" || b.status === filter.status)
    .filter((b) => (!filter.from || dayKey(b.blockedAt) >= filter.from) && (!filter.to || dayKey(b.blockedAt) <= filter.to))
    .filter(
      (b) =>
        !q ||
        [`table ${b.table}`, BLOCK_REASONS[b.reason], b.note, b.blockedBy, b.unblockedBy, b.orderId, b.orderSummary]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.blockedAt - a.blockedAt);
}

/** Every block, unblock and expiry, newest first. Kept for the retention period. */
export async function getBlockLog(q?: string): Promise<BlockEvent[]> {
  boot();
  await requireRole("staff", "owner");
  await wait(READ);
  const t = now();
  const events: BlockEvent[] = [];
  for (const b of blocks()) {
    const why = BLOCK_REASONS[b.reason] + (b.note ? `: ${b.note}` : "");
    events.push({ id: `${b.id}-b`, at: b.blockedAt, type: "block", blockId: b.id, table: b.table, by: b.blockedBy, detail: `${why} · ${BLOCK_DURATIONS[b.duration]}`, orderId: b.orderId });
    if (b.unblockedAt)
      events.push({ id: `${b.id}-u`, at: b.unblockedAt, type: "unblock", blockId: b.id, table: b.table, by: b.unblockedBy ?? "", detail: b.unblockNote ?? "", orderId: b.orderId });
    else if (b.expiresAt !== null && b.expiresAt <= t)
      events.push({ id: `${b.id}-e`, at: b.expiresAt, type: "expire", blockId: b.id, table: b.table, by: "Automatic", detail: `${BLOCK_DURATIONS[b.duration]} ended`, orderId: b.orderId });
  }
  const needle = q?.trim().toLowerCase();
  return events
    .filter((e) => !needle || [`table ${e.table}`, e.by, e.detail, e.orderId, e.type].filter(Boolean).some((s) => s!.toLowerCase().includes(needle)))
    .sort((a, b) => b.at - a.at);
}

// --- Dish suggestions --------------------------------------------------------

export async function suggestDish(input: { name: string; category: string; veg: boolean; price: number; description: string }) {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(WRITE);
  if (!input.name.trim() || !(input.price > 0)) throw new ApiError("bad_input", "Add a name and a price.");
  const s: Suggestion = {
    id: `G${randomId(8)}`,
    name: input.name.trim(),
    category: input.category,
    veg: input.veg,
    price: Math.round(input.price),
    description: input.description.trim(),
    status: "pending",
    suggestedBy: user.name,
    suggestedById: user.id,
    suggestedAt: now(),
  };
  store.update("suggestions", suggestions, (list) => [s, ...list]);
  return s;
}

/** Staff see their own suggestions; the owner sees all. */
export async function listSuggestions(): Promise<Suggestion[]> {
  boot();
  const user = await requireRole("staff", "owner");
  await wait(READ);
  return suggestions()
    .filter((s) => user.role === "owner" || s.suggestedById === user.id)
    .sort((a, b) => b.suggestedAt - a.suggestedAt);
}

export async function reviewSuggestion(
  id: string,
  decision: { approve: true; edits?: Partial<Pick<Suggestion, "name" | "category" | "veg" | "price" | "description">> } | { approve: false; reason?: string },
) {
  boot();
  const user = await requireRole("owner");
  await wait(WRITE);
  const s = suggestions().find((x) => x.id === id);
  if (!s || s.status !== "pending") throw new ApiError("not_found", "This suggestion was already reviewed.");
  let next: Suggestion;
  if (decision.approve) {
    const final = { ...s, ...decision.edits };
    const itemId = addItem(final);
    next = { ...final, status: "approved", reviewedBy: user.name, reviewedAt: now(), itemId };
  } else {
    next = { ...s, status: "rejected", reviewedBy: user.name, reviewedAt: now(), reason: decision.reason?.trim() || undefined };
  }
  store.update("suggestions", suggestions, (list) => list.map((x) => (x.id === id ? next : x)));
  return next;
}

// --- Accounts and sign-in ----------------------------------------------------

export type LoginResult =
  | { ok: true; role: Role; home: string }
  | { ok: false; code: "invalid"; attemptsLeft: number }
  | { ok: false; code: "locked"; until: number }
  | { ok: false; code: "error" };

/** Signs in with a username and an 8-digit PIN. The server checks it and sets the session cookie. */
export async function login(username: string, pin: string, next?: string): Promise<LoginResult> {
  boot();
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin, next }),
      cache: "no-store",
    });
    return (await r.json()) as LoginResult;
  } catch {
    return { ok: false, code: "error" };
  }
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  // Tells other tabs on this device to check their sign-in again.
  store.deviceSet("auth", now());
}

/** The account signed in with this browser, or null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  boot();
  return serverUser();
}

export async function listStaff(): Promise<Account[]> {
  boot();
  await requireRole("owner");
  await wait(READ);
  return accounts().map(cleanAccount);
}

function nextUsername() {
  const nums = accounts()
    .map((a) => a.username.match(/\.staff(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  return `${demo.restaurantCode}.staff${Math.max(0, ...nums) + 1}`;
}

/** Adds a staff account. The PIN is returned once and never shown again. */
export async function addStaff(name: string): Promise<{ account: Account; pin: string }> {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  if (!name.trim()) throw new ApiError("bad_input", "Enter a name.");
  const username = nextUsername();
  const pin = newPin();
  const acc: AccountRecord = { id: `U${randomId(8)}`, name: name.trim(), username, role: "staff", createdAt: now(), pinHash: pinHash(username, pin) };
  store.update("staff", accounts, (list) => [...list, acc]);
  return { account: cleanAccount(acc), pin };
}

export async function resetStaffPin(id: string): Promise<string> {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  const pin = newPin();
  store.update("staff", accounts, (list) => list.map((a) => (a.id === id ? { ...a, pinHash: pinHash(a.username, pin) } : a)));
  return pin;
}

export async function removeStaff(id: string) {
  boot();
  const user = await requireRole("owner");
  await wait(WRITE);
  if (id === user.id) throw new ApiError("bad_input", "You cannot remove your own account.");
  store.update("staff", accounts, (list) => list.filter((a) => a.id !== id || a.role === "owner"));
}

// --- Discounts ---------------------------------------------------------------

export async function listDiscounts(): Promise<Discount[]> {
  boot();
  await requireRole("owner");
  await wait(READ);
  return [...discounts()].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
}

function checkDiscount(d: Omit<Discount, "id" | "createdAt">) {
  if (!d.name.trim()) throw new ApiError("bad_input", "Give the discount a name.");
  if (!(d.value > 0) || (d.kind === "percent" && d.value > 90)) throw new ApiError("bad_input", "Enter a discount between 1 and 90%.");
  if (d.endsOn < d.startsOn) throw new ApiError("bad_input", "The end date is before the start date.");
  if (d.target.type !== "all" && d.target.ids.length === 0) throw new ApiError("bad_input", "Choose at least one dish or category.");
}

export async function createDiscount(d: Omit<Discount, "id" | "createdAt">) {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  checkDiscount(d);
  const full: Discount = { ...d, name: d.name.trim(), id: `dc-${randomId(6).toLowerCase()}`, createdAt: now() };
  store.update("discounts", discounts, (list) => [...list, full]);
  return full;
}

export async function updateDiscount(id: string, change: Partial<Omit<Discount, "id" | "createdAt">>) {
  boot();
  await requireRole("owner");
  await wait(WRITE / 2);
  const cur = discounts().find((d) => d.id === id);
  if (!cur) throw new ApiError("not_found", "This discount no longer exists.");
  const next = { ...cur, ...change };
  checkDiscount(next);
  store.update("discounts", discounts, (list) => list.map((d) => (d.id === id ? next : d)));
}

export async function deleteDiscount(id: string) {
  boot();
  await requireRole("owner");
  await wait(WRITE);
  store.update("discounts", discounts, (list) => list.filter((d) => d.id !== id));
}

// --- Subscription (owner only) -----------------------------------------------

export async function getSubscription(): Promise<Subscription> {
  boot();
  await requireRole("owner");
  await wait(READ);
  return subscriptionStatus();
}

// --- Reports -----------------------------------------------------------------
// The one-year dataset is generated on first use from a fixed seed (so every
// screen and PDF shows the same numbers) and held in memory. Loaded only by
// the owner pages.

const dataset = () => import("./mock/dataset");

const datasetContext = () => ({ today: today(), now: now(), liveOrders: orders() });

export async function getOverview(): Promise<Overview> {
  boot();
  await requireRole("owner");
  const ds = await dataset();
  const ctx = datasetContext();
  const r = await ds.report(ctx, ctx.today, ctx.today, false);
  const t = now();
  const live = ctx.liveOrders;
  return {
    today: ctx.today,
    sales: r.kpis.sales,
    orders: r.kpis.orders,
    avgBill: r.kpis.avgBill,
    activeTables: new Set(sessions().filter((s) => !s.endedAt && s.expiresAt > t).map((s) => s.table)).size,
    pendingApprovals: suggestions().filter((s) => s.status === "pending").length,
    blockedGuests: blocks().filter((b) => blockStatus(b, t) === "active").length,
    openOrders: live.filter((o) => o.status === "received" || o.status === "preparing").length,
    latest: (await ds.queryOrders(ctx, { from: ctx.today, to: ctx.today, page: 0, pageSize: 8 })).rows,
  };
}

/** Daily sales for the whole retention window (the timeline). */
export async function getTimeline() {
  boot();
  await requireRole("owner");
  const ds = await dataset();
  return ds.timeline(datasetContext());
}

export async function getSalesReport(range: { from: string; to: string; compare?: boolean }) {
  boot();
  await requireRole("owner");
  const ds = await dataset();
  return ds.report(datasetContext(), range.from, range.to, range.compare ?? false);
}

/** Orders from the last 12 months with filters, newest first, one page at a time. */
export async function getOrders(query: import("./mock/dataset").OrderQuery) {
  boot();
  await requireRole("owner");
  const ds = await dataset();
  return ds.queryOrders(datasetContext(), query);
}

// --- Demo controls -----------------------------------------------------------

export async function resetDemoData() {
  store.clearAll();
  store.deviceSet("guest", null);
  seed();
}

/** Subscription states for the demo: active, renewal due in 3 days, due today, or expired. */
export async function setDemoSubscription(mode: "active" | "due" | "today" | "expired") {
  boot();
  const offset = { active: 30, due: 3, today: 0, expired: -1 }[mode];
  store.write("settings", { ...settings(), subscriptionEndsOn: addDays(today(), offset) });
}

/** A cart line with the first version and the first required choices picked. */
function line(itemId: string, qty: number, note = ""): CartInput {
  const item = baseMenu.items.find((i) => i.id === itemId);
  const selection: Selection = {};
  for (const g of item?.options ?? []) selection[g.id] = g.required ? g.choices[0].label : null;
  return { itemId, variantId: item?.variants?.[0].id ?? null, selection, note, qty };
}

const SAMPLE_CARTS: CartInput[][] = [
  [line("paneer-tikka", 1), line("naan-naan", 3), line("dal-makkhan-wali", 1, "Less spicy, please")],
  [line("hazratgunj-murg-dum-biryani", 2), line("cold-coffee", 2, "No ice")],
  [line("mighty-manchurian", 1, "Extra spicy"), line("hakka-noodles", 1), line("veg-momos", 1)],
  [line("murg-angara", 1), line("choice-of-roti", 4), line("gulaab-jaamun-with-rabri", 2)],
];

function sampleCart(n: number): CartInput[] {
  const items = new Map(liveMenu().items.map((i) => [i.id, i]));
  const cart = SAMPLE_CARTS[n % SAMPLE_CARTS.length].filter((l) => items.get(l.itemId)?.available);
  if (cart.length) return cart;
  // Fallback: the first orderable dishes without choices.
  return liveMenu()
    .items.filter((i) => i.available && isOrderable(i) && !i.variants && !i.options?.some((g) => g.required))
    .slice(n % 20, (n % 20) + 2)
    .map((i) => ({ itemId: i.id, variantId: null, selection: {}, note: "", qty: 1 }));
}

/**
 * Demo only: a new guest order arrives as if from a phone at a table.
 * "from-home" is the block demo: a late order from a table nobody is sitting at.
 */
export async function simulateOrder(kind: "simulated" | "from-home"): Promise<Order> {
  boot();
  await wait(WRITE);
  const t = now();
  const busy = new Set(sessions().filter((s) => !s.endedAt && s.expiresAt > t).map((s) => s.table));
  const free = tables().filter((x) => !busy.has(x.number));
  const pool = free.length ? free : tables();
  const table = pool[Math.floor(Math.random() * pool.length)];
  const s: GuestSession = {
    id: `S${randomId(12)}`,
    deviceId: `D${randomId(12)}`,
    table: table.number,
    token: table.token,
    startedAt: t - (kind === "from-home" ? 70 : 2) * 60_000,
    expiresAt: t + demo.sessionMinutes * 60_000,
    lastOrderAt: t,
  };
  const n = Math.floor(Math.random() * 100);
  const lines = priceLines(
    kind === "from-home"
      ? [line("hazratgunj-murg-dum-biryani", 3, "Pack it, someone will come to pick it up"), line("signature-murg-makkhan-wala", 2)].filter((l) =>
          liveMenu().items.some((i) => i.id === l.itemId && i.available),
        )
      : sampleCart(n),
  );
  const order: Order = { id: newOrderId(), table: table.number, sessionId: s.id, deviceId: s.deviceId, placedAt: t, status: "received", lines, ...totals(lines), live: true, demo: kind };
  store.update("sessions", sessions, (list) => [...list, s]);
  store.update("orders", orders, (list) => [...list, order]);
  return order;
}

// --- Device-only preferences -------------------------------------------------
// Stay in the browser even with a real backend (cart, mute, dismissed banner).

export const devicePrefs = {
  get: <T,>(key: string, fallback: T, session = false) => store.deviceGet(key, fallback, session),
  set: <T,>(key: string, value: T | null, session = false) => store.deviceSet(key, value, session),
};

// --- Seed data ---------------------------------------------------------------

// Sign-in PINs are checked on the server (src/lib/auth/accounts.ts); the demo store only keeps names.
const STAFF_SEED: { name: string; username: string; role: Role }[] = [
  { name: "Owner", username: `${demo.restaurantCode}.owner`, role: "owner" },
  { name: "Amit Verma", username: `${demo.restaurantCode}.staff1`, role: "staff" },
  { name: "Pooja Singh", username: `${demo.restaurantCode}.staff2`, role: "staff" },
  { name: "Sanjay Yadav", username: `${demo.restaurantCode}.staff3`, role: "staff" },
];

/** Table tokens: demo1 to demo5 for tables 1 to 5, a fixed random-looking token for the rest. */
function tableTokens(): TableInfo[] {
  return Array.from({ length: demo.tableCount }, (_, i) => {
    const n = i + 1;
    if (n <= 5) return { number: n, token: `demo${n}` };
    const r = seeded(hash(`table-${n}`));
    let token = "";
    for (let k = 0; k < 8; k++) token += "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(r() * 31)];
    return { number: n, token };
  });
}

function seed() {
  const t = now();
  const min = 60_000;
  const hr = 3_600_000;
  const staff: AccountRecord[] = STAFF_SEED.map((s, i) => ({
    id: `U-seed-${i}`,
    name: s.name,
    username: s.username,
    role: s.role,
    createdAt: t - (200 - i * 30) * DAY,
    pinHash: pinHash(s.username, newPin()),
  }));
  store.write("staff", staff);
  store.write("tables", tableTokens());
  store.write("settings", { subscriptionEndsOn: addDays(today(), 30) });
  store.write("discounts", CAMPAIGNS);
  store.write("menu", { edits: {}, added: [], deleted: [], outOfStock: ["gosht-rogan-josh"].filter((id) => baseMenu.items.some((i) => i.id === id)), categoryOrder: null } satisfies MenuPatch);
  store.write("attempts", {});

  // Two tables already seated, so the staff board is not empty.
  const s2: GuestSession = { id: `S${randomId(12)}`, deviceId: `D${randomId(12)}`, table: 2, token: "demo2", startedAt: t - 32 * min, expiresAt: t + 70 * min, lastOrderAt: t - 22 * min };
  const s4: GuestSession = { id: `S${randomId(12)}`, deviceId: `D${randomId(12)}`, table: 4, token: "demo4", startedAt: t - 9 * min, expiresAt: t + 85 * min, lastOrderAt: t - 4 * min };
  store.write("sessions", [s2, s4]);
  store.write("orders", []);
  const make = (s: GuestSession, cart: CartInput[], placedAt: number, extra: Partial<Order>): Order => {
    const lines = priceLines(cart);
    return { id: newOrderId(), table: s.table, sessionId: s.id, deviceId: s.deviceId, placedAt, status: "received", lines, ...totals(lines), live: true, ...extra };
  };
  store.write("orders", [
    make(s2, sampleCart(0), t - 22 * min, { status: "preparing", acceptedAt: t - 20 * min, handledBy: "Amit Verma" }),
    make(s4, sampleCart(1), t - 4 * min, {}),
  ]);

  // Blocked guests: active, expired and unblocked.
  const b = (
    table: number,
    agoMs: number,
    reason: BlockReason,
    duration: BlockDuration,
    by: string,
    extra: Partial<Block> = {},
    summary = "2 × Hazratgunj Murg Dum Biryani, 1 × Murg Angara",
  ): Block => {
    const at = t - agoMs;
    const ms = DURATION_MS[duration];
    return {
      id: `B${randomId(10)}`,
      sessionId: `S${randomId(12)}`,
      deviceId: `D${randomId(12)}`,
      table,
      orderId: newOrderId(),
      orderSummary: summary,
      reason,
      duration,
      blockedAt: at,
      expiresAt: ms === null ? null : at + ms,
      blockedBy: by,
      ...extra,
    };
  };
  store.write("blocks", [
    b(3, 40 * min, "not-here", "24h", "Amit Verma", {}, "3 × Hazratgunj Murg Dum Biryani, 2 × Signature Murg Makkhan Wala"),
    b(8, 3 * hr, "prank", "7d", "Pooja Singh", {}, "10 × Gulaab Jaamun with Rabri"),
    b(11, 2 * DAY + 5 * hr, "other", "until", "Owner", { note: "Repeated orders late at night after closing" }, "4 × Paneer Tikka"),
    b(5, 3 * DAY + 2 * hr, "not-here", "1h", "Sanjay Yadav", {}, "2 × Dal Makkhan Wali, 6 × Naan Naan"),
    b(2, 9 * DAY + 6 * hr, "prank", "24h", "Amit Verma", {}, "8 × Cold Coffee"),
    b(6, 5 * DAY + 3 * hr, "not-here", "24h", "Pooja Singh", { unblockedAt: t - 5 * DAY + 1 * hr, unblockedBy: "Owner", unblockNote: "Guest was seated in the garden" }),
    b(9, 20 * DAY, "prank", "until", "Amit Verma", { unblockedAt: t - 18 * DAY, unblockedBy: "Amit Verma", unblockNote: "Spoke to the guest, it was a mistake" }, "1 × Mighty Manchurian"),
    b(4, 45 * DAY, "other", "7d", "Sanjay Yadav", { note: "Ordered from the parking area again and again" }, "5 × Choice of Roti"),
  ]);

  store.write("suggestions", [
    { id: `G${randomId(8)}`, name: "Paneer Kathi Roll", category: "sides", veg: true, price: 189, description: "Spiced paneer, onions and mint chutney rolled in a flaky paratha.", status: "pending", suggestedBy: "Amit Verma", suggestedById: "U-seed-1", suggestedAt: t - 26 * hr },
    { id: `G${randomId(8)}`, name: "Kulhad Chai", category: "creamery", veg: true, price: 49, description: "Masala chai served in a clay cup.", status: "pending", suggestedBy: "Pooja Singh", suggestedById: "U-seed-2", suggestedAt: t - 3 * DAY },
    { id: `G${randomId(8)}`, name: "Chicken Malai Tikka", category: "tandoor", veg: false, price: 369, description: "Boneless chicken in cream, cheese and cardamom, cooked in the tandoor.", status: "pending", suggestedBy: "Amit Verma", suggestedById: "U-seed-1", suggestedAt: t - 5 * hr },
    { id: `G${randomId(8)}`, name: "Chocolate Momos", category: "desserts", veg: true, price: 199, description: "Fried momos with a molten chocolate filling.", status: "rejected", suggestedBy: "Sanjay Yadav", suggestedById: "U-seed-3", suggestedAt: t - 12 * DAY, reviewedBy: "Owner", reviewedAt: t - 11 * DAY, reason: "Does not fit the menu" },
  ] satisfies Suggestion[]);

  store.write("meta", { version: SEED_VERSION, seededAt: t });
}
