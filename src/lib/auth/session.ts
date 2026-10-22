/**
 * The staff and owner sign-in token: a JWT (HS256) in an httpOnly cookie.
 * Used by the proxy (src/proxy.ts) and the /api/auth routes, never by the
 * browser (the cookie is not readable from JavaScript).
 */
import { jwtVerify, SignJWT } from "jose";
import { basePath, demo } from "@/config/demo";

export type Role = "staff" | "owner";
export type Session = { sub: string; role: Role; restaurantCode: string; iat: number; exp: number };

export const SESSION_COOKIE = "hg_session";
/** How long a sign-in lasts. */
export const SESSION_HOURS: Record<Role, number> = { staff: 12, owner: 8 };

export const homeFor = (role: Role) => `${basePath}/${role}`;
export const loginPath = `${basePath}/login`;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Set it in .env.local for local use, or in the Vercel project's Environment Variables.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function signSession(username: string, role: Role) {
  return new SignJWT({ role, restaurantCode: demo.restaurantCode })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS[role]}h`)
    .sign(secret());
}

/** The session in a token, or null if it is missing, tampered with, expired or for another restaurant. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const { sub, role, restaurantCode, iat, exp } = payload;
    if (typeof sub !== "string" || (role !== "staff" && role !== "owner") || restaurantCode !== demo.restaurantCode) return null;
    if (typeof iat !== "number" || typeof exp !== "number") return null;
    return { sub, role, restaurantCode, iat, exp };
  } catch {
    return null;
  }
}

export const cookieOptions = (role: Role) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_HOURS[role] * 3600,
});

/** A "next" path is only followed when it stays inside that role's own area. */
export function safeNext(next: string | null | undefined, role: Role) {
  const home = homeFor(role);
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return home;
  return next === home || next.startsWith(`${home}/`) || next.startsWith(`${home}?`) || next.startsWith(`${home}#`) ? next : home;
}
