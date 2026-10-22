import { NextResponse, type NextRequest } from "next/server";
import { homeFor, loginPath, safeNext, SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Staff and owner route protection. Every request to /h/staff/* and /h/owner/*
 * needs a valid session cookie of that role; /h/login sends a signed-in
 * account to its own home. The /api/auth routes check the cookie themselves.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url));
    if (token && !session) res.cookies.delete(SESSION_COOKIE);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  if (pathname === loginPath) {
    if (session) return go(safeNext(req.nextUrl.searchParams.get("next"), session.role));
    const res = NextResponse.next();
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const area = pathname.startsWith(homeFor("owner")) ? "owner" : "staff";
  if (!session) return go(`${loginPath}?next=${encodeURIComponent(pathname + search)}`);
  if (session.role !== area) return go(homeFor(session.role));

  // Never kept by the browser: after sign-out, Back cannot show these pages.
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return res;
}

// Literal paths (Next reads this statically); "h" is demo.restaurantCode.
export const config = {
  matcher: ["/h/login", "/h/staff", "/h/staff/:path*", "/h/owner", "/h/owner/:path*"],
};
