import { NextResponse, type NextRequest } from "next/server";
import { checkPin, clearFailures, lockedUntil, recordFailure } from "@/lib/auth/accounts";
import { cookieOptions, safeNext, SESSION_COOKIE, signSession } from "@/lib/auth/session";

const PIN = /^\d{8}$/;

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Sign-in: username + 8-digit PIN. Sets the session cookie on success. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { username?: unknown; pin?: unknown; next?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase().slice(0, 64) : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const key = `${username}|${clientIp(req)}`;

  const until = lockedUntil(key);
  if (until) return NextResponse.json({ ok: false, code: "locked", until }, { status: 429 });

  // A malformed PIN still counts and still runs the hash check, so every wrong answer looks the same.
  const role = await checkPin(username, PIN.test(pin) ? pin : "--------");
  if (!role || !PIN.test(pin)) {
    const r = recordFailure(key);
    return r.lockedUntil
      ? NextResponse.json({ ok: false, code: "locked", until: r.lockedUntil }, { status: 429 })
      : NextResponse.json({ ok: false, code: "invalid", attemptsLeft: r.attemptsLeft }, { status: 401 });
  }

  clearFailures(key);
  const res = NextResponse.json({ ok: true, role, home: safeNext(typeof body?.next === "string" ? body.next : null, role) });
  res.cookies.set(SESSION_COOKIE, await signSession(username, role), cookieOptions(role));
  res.headers.set("Cache-Control", "no-store");
  return res;
}
