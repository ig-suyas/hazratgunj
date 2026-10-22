import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/** Sign-out: clears the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
