/**
 * MOCK, replace with real backend. The demo "server": small live state in
 * localStorage, shared between tabs on the same device with BroadcastChannel
 * (and the storage event as a fallback). Only src/lib/api.ts imports this.
 *
 * Nothing here is shared between devices: a guest's phone and a staff tablet
 * only see each other through a real backend.
 */

const PREFIX = "hg.v1.";
const CHANNEL = "hg-demo";

export type Topic =
  | "tables"
  | "sessions"
  | "orders"
  | "blocks"
  | "blockLog"
  | "menu"
  | "suggestions"
  | "staff"
  | "discounts"
  | "settings"
  | "attempts"
  | "meta";

const cache = new Map<string, unknown>();
const memory = new Map<string, string>(); // used when localStorage is blocked
const listeners = new Set<(topics: Set<string>) => void>();
let channel: BroadcastChannel | null = null;
let wired = false;

const isBrowser = () => typeof window !== "undefined";

function rawGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {}
  return memory.get(key) ?? null;
}

function rawSet(key: string, value: string | null) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function emit(topics: Set<string>) {
  listeners.forEach((l) => l(topics));
}

function wire() {
  if (wired || !isBrowser()) return;
  wired = true;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent<{ topics: string[] }>) => {
      const topics = new Set(e.data.topics);
      topics.forEach((t) => cache.delete(t));
      emit(topics);
    };
  } catch {}
  window.addEventListener("storage", (e) => {
    if (e.key === null) {
      cache.clear();
      emit(new Set(["*"]));
    } else if (e.key.startsWith(PREFIX)) {
      const topic = e.key.slice(PREFIX.length);
      cache.delete(topic);
      emit(new Set([topic]));
    } else if (e.key.startsWith(DEVICE)) {
      emit(new Set([`device:${e.key.slice(DEVICE.length)}`]));
    }
  });
}

export function read<T>(topic: Topic, fallback: () => T): T {
  wire();
  if (cache.has(topic)) return cache.get(topic) as T;
  const raw = isBrowser() ? rawGet(PREFIX + topic) : null;
  let value: T;
  try {
    value = raw === null ? fallback() : (JSON.parse(raw) as T);
  } catch {
    value = fallback();
  }
  cache.set(topic, value);
  return value;
}

export function write<T>(topic: Topic, value: T) {
  wire();
  cache.set(topic, value);
  if (isBrowser()) rawSet(PREFIX + topic, JSON.stringify(value));
  const topics = new Set<string>([topic]);
  emit(topics);
  channel?.postMessage({ topics: [topic] });
}

export function update<T>(topic: Topic, fallback: () => T, fn: (value: T) => T): T {
  const next = fn(read(topic, fallback));
  write(topic, next);
  return next;
}

/** Wipes every demo key on this device (all tabs are told). */
export function clearAll() {
  if (!isBrowser()) return;
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
  } catch {}
  memory.forEach((_, k) => k.startsWith(PREFIX) && keys.push(k));
  keys.forEach((k) => rawSet(k, null));
  cache.clear();
  emit(new Set(["*"]));
  channel?.postMessage({ topics: ["*"] });
}

/** Called with the changed topics ("*" = everything). */
export function subscribe(cb: (topics: Set<string>) => void) {
  wire();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// --- Device-only values ------------------------------------------------------
// These belong to the browser even with a real backend: device id, the signed-in
// account on this device, the cart, mute and dismissed banners.

const DEVICE = "hg.device.";

export function deviceGet<T>(key: string, fallback: T, session = false): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = (session ? sessionStorage : localStorage).getItem(DEVICE + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    const raw = memory.get(DEVICE + key);
    return raw === undefined ? fallback : (JSON.parse(raw) as T);
  }
}

export function deviceSet<T>(key: string, value: T | null, session = false) {
  if (!isBrowser()) return;
  const raw = value === null ? null : JSON.stringify(value);
  if (raw === null) memory.delete(DEVICE + key);
  else memory.set(DEVICE + key, raw);
  try {
    const s = session ? sessionStorage : localStorage;
    if (raw === null) s.removeItem(DEVICE + key);
    else s.setItem(DEVICE + key, raw);
  } catch {}
  const topics = new Set([`device:${key}`]);
  emit(topics);
}
