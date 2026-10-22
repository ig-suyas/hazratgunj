/**
 * Demo sign-in accounts, checked on the server only. PINs are stored as
 * scrypt hashes (salt$hash). MOCK, replace with real backend: accounts and
 * PIN hashes then live in the database, and the lock in a shared store.
 */
import "server-only";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { demo } from "@/config/demo";
import type { Role } from "./session";

const scryptAsync = promisify(scrypt) as (pin: string, salt: Buffer, len: number) => Promise<Buffer>;

const ACCOUNTS: Record<string, { role: Role; pinHash: string }> = {
  [`${demo.restaurantCode}.owner`]: {
    role: "owner",
    pinHash: "scrypt$aa67f150a0fbf638c04f3135bc507855$caa225688269a60ebf3888da11cf5bcc6106f389a7d67e41c9c69d483ea84508",
  },
  [`${demo.restaurantCode}.staff1`]: {
    role: "staff",
    pinHash: "scrypt$34f0c66fbdce4f9f411ac6df739865c3$b7f38f5838537050476b0eaebbb0250eaacb5f6c98995620c81916e26a4bfedc",
  },
};
// Checked when the username is unknown, so both cases take the same time.
const DUMMY_HASH = "scrypt$e7e7ebc2e3996be5278e33e0c1e4e1b5$1ffd5b9b53fef8a9c4bef4757e7c3b8f26a65d38fa4c09270af92d363c422e0c";

/**
 * The "Demo access" hint on the sign-in page. Rendered on the server, and
 * only while demo.showDemoHint is true; it never reaches a client bundle.
 */
export const DEMO_HINT = [
  { role: "Owner", username: `${demo.restaurantCode}.owner`, pin: "12345678" },
  { role: "Staff", username: `${demo.restaurantCode}.staff1`, pin: "87654321" },
];

async function pinMatches(pin: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(pin, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** The account's role if the username and PIN match, else null. */
export async function checkPin(username: string, pin: string): Promise<Role | null> {
  const acc = Object.hasOwn(ACCOUNTS, username) ? ACCOUNTS[username] : null;
  const ok = await pinMatches(pin, acc?.pinHash ?? DUMMY_HASH);
  return ok && acc ? acc.role : null;
}

// --- Wrong-PIN lock (username + IP, in memory) ---------------------------------

type Attempts = { fails: number; lockedUntil: number | null };
const g = globalThis as typeof globalThis & { __hgAttempts?: Map<string, Attempts> };
const attempts = (g.__hgAttempts ??= new Map());

export function lockedUntil(key: string) {
  const a = attempts.get(key);
  return a?.lockedUntil && a.lockedUntil > Date.now() ? a.lockedUntil : null;
}

/** Counts a wrong PIN. Returns the lock end time once the limit is reached. */
export function recordFailure(key: string): { attemptsLeft: number; lockedUntil: number | null } {
  const a = attempts.get(key);
  const fails = (a && !a.lockedUntil ? a.fails : 0) + 1;
  if (fails >= demo.maxPinAttempts) {
    const until = Date.now() + demo.lockMinutes * 60_000;
    attempts.set(key, { fails: 0, lockedUntil: until });
    return { attemptsLeft: 0, lockedUntil: until };
  }
  attempts.set(key, { fails, lockedUntil: null });
  return { attemptsLeft: demo.maxPinAttempts - fails, lockedUntil: null };
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
