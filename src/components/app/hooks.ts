"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribe } from "@/lib/api";

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

// One shared clock that ticks only while something listens.
let clock = 0;
const ticks = new Map<number, { timer: number; listeners: Set<() => void> }>();
function subscribeClock(every: number) {
  return (cb: () => void) => {
    let t = ticks.get(every);
    if (!t) {
      clock = Date.now();
      const listeners = new Set<() => void>();
      const timer = window.setInterval(() => {
        clock = Date.now();
        listeners.forEach((l) => l());
      }, every);
      ticks.set(every, (t = { timer, listeners }));
      // The first reading may be from an earlier, stopped clock.
      queueMicrotask(() => listeners.forEach((l) => l()));
    }
    t.listeners.add(cb);
    const entry = t;
    return () => {
      entry.listeners.delete(cb);
      if (entry.listeners.size === 0) {
        window.clearInterval(entry.timer);
        ticks.delete(every);
      }
    };
  };
}
const clockSubs = new Map<number, (cb: () => void) => () => void>();

/** Current time, updated every `every` ms. 0 on the server. */
export function useNow(every = 30_000) {
  let sub = clockSubs.get(every);
  if (!sub) clockSubs.set(every, (sub = subscribeClock(every)));
  return useSyncExternalStore(
    sub,
    () => clock || (clock = Date.now()),
    () => 0,
  );
}

type LiveState<T> = { key: string; data?: T; error?: unknown };

/**
 * Loads data from the api and reloads it whenever the demo store changes
 * (in this tab or another). `key` identifies the request: a new key loads
 * again, keeping the previous data on screen meanwhile.
 */
export function useLive<T>(load: () => Promise<T>, key: string, topics?: string[]) {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const [state, setState] = useState<LiveState<T>>({ key: "" });
  const [version, setVersion] = useState(0);
  const topicKey = topics?.join(",") ?? "*";

  useEffect(() => {
    let alive = true;
    let seq = 0;
    const run = () => {
      const n = ++seq;
      loadRef.current().then(
        (data) => alive && n === seq && setState({ key, data }),
        (error: unknown) => alive && n === seq && setState((s) => ({ key, data: s.data, error })),
      );
    };
    run();
    const wanted = topicKey === "*" ? null : topicKey.split(",");
    const unsub = subscribe((changed) => {
      if (!wanted || changed.has("*") || wanted.some((t) => changed.has(t))) run();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [key, topicKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data: state.data, error: state.error, loading: state.key !== key, reload };
}

/** Stable callback that always sees the latest props/state. */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
