import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, type Role } from "@/lib/auth/session";

/**
 * The signed-in account from the session cookie. With ?role=owner (or
 * ?role=staff,owner) it also answers 403 unless the account has that role;
 * src/lib/api.ts asks this before every staff or owner action.
 */
export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const headers = { "Cache-Control": "no-store" };
  const roles = req.nextUrl.searchParams.get("role")?.split(",") as Role[] | undefined;
  // A plain "who is signed in?" is not an error when nobody is (the sign-in page asks it).
  if (!session) return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: roles ? 401 : 200, headers });
  if (roles && !roles.includes(session.role)) return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403, headers });
  return NextResponse.json({ ok: true, username: session.sub, role: session.role, expiresAt: session.exp * 1000 }, { headers });
}
