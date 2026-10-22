"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createSession, getGuestState, subscribe, type GuestState } from "@/lib/api";

const noop = () => () => {};

/** The table token from the QR link (/menu?t=demo1). null without one, and on the server. */
export function useTableToken(): string | null {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("t")?.trim() || null,
    () => null,
  );
}

export type GuestMode =
  | { kind: "readonly" }
  | { kind: "loading" }
  | { kind: "rescan" }
  | { kind: "unavailable" }
  | { kind: "active"; sessionId: string; table: number; expiresAt: number };

const toMode = (s: GuestState): GuestMode =>
  s.kind === "active" ? s : s.kind === "unavailable" ? { kind: "unavailable" } : { kind: "rescan" };

/**
 * Whether this guest can order. Ordering needs the QR link's token; the
 * session it opens can expire, be cleared by staff or be blocked while the
 * menu is open, so the state is re-checked on every change and at expiry.
 */
export function useGuestOrdering(): GuestMode {
  const token = useTableToken();
  const [mode, setMode] = useState<{ token: string; mode: GuestMode } | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    let sessionId: string | null = null;
    let timer: number | undefined;
    const apply = (s: GuestState) => {
      if (!alive) return;
      window.clearTimeout(timer);
      if (s.kind === "active") {
        sessionId = s.sessionId;
        // Re-check when the session would run out (each order extends it).
        timer = window.setTimeout(check, Math.max(1000, s.expiresAt - Date.now() + 500));
      }
      setMode({ token, mode: toMode(s) });
    };
    const check = () => {
      if (sessionId) getGuestState(sessionId).then(apply);
    };
    createSession(token).then(apply);
    const unsub = subscribe((topics) => {
      if (["*", "sessions", "blocks", "settings", "orders"].some((t) => topics.has(t))) check();
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      unsub();
    };
  }, [token]);

  if (!token) return { kind: "readonly" };
  if (!mode || mode.token !== token) return { kind: "loading" };
  return mode.mode;
}
