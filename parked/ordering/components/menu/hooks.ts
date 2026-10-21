"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Table number from the QR code link (?table=7). null on the server or when absent/invalid. */
export function useQrTable(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const t = new URLSearchParams(window.location.search).get("table")?.trim() ?? "";
      return /^\d{1,3}$/.test(t) && Number(t) > 0 ? String(Number(t)) : null;
    },
    () => null,
  );
}

// --- Session store -----------------------------------------------------------
// Values live in sessionStorage (survive a refresh, cleared when the tab
// closes) with an in-memory copy, so the page still works if storage is
// blocked. Components read through useSyncExternalStore: the server and the
// first client render see the fallback, then the stored value.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function readSession<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSession<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    sessionStorage.setItem(key, raw);
  } catch {}
  listeners.forEach((l) => l());
}

export function useSessionValue<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const [stableFallback] = useState(fallback);
  const value = useMemo(() => {
    if (raw === null) return stableFallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return stableFallback;
    }
  }, [raw, stableFallback]);
  const set = useCallback((v: T) => writeSession(key, v), [key]);
  return [value, set] as const;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Stable callback that always sees the latest props/state. */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
