// MOCK, replace with real backend: ids and seeded randomness for the demo store.

/** No 0/O, 1/I/L: easy to read aloud and to type. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Random, non-sequential id from the browser's secure generator. */
export function randomId(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Order ids look like HG-7KQ3M2: random, never sequential. */
export const newOrderId = () => `HG-${randomId(6)}`;

/** Same id format from a seeded generator (historical demo orders). */
export function seededOrderId(rand: () => number) {
  let s = "HG-";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return s;
}

/** Fast 32-bit string hash (FNV-1a). */
export function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded generator (mulberry32): the same seed always gives the same sequence. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index picked with probability proportional to its weight. */
export function pickWeighted(rand: () => number, weights: ArrayLike<number>, total?: number) {
  let sum = total ?? 0;
  if (total === undefined) for (let i = 0; i < weights.length; i++) sum += weights[i];
  let r = rand() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** 8-digit PIN. */
export function newPin() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(10_000_000 + (bytes[0] % 90_000_000));
}

/**
 * MOCK ONLY: a real backend stores PINs with a slow salted hash (argon2 or
 * bcrypt) on the server. This only keeps plain PINs out of the demo storage.
 */
export const pinHash = (username: string, pin: string) => `h1:${hash(`${username.toLowerCase()}:${pin}:hg-demo`).toString(36)}`;
