/**
 * Demo settings. MOCK, replace with real backend: a real system loads these
 * per restaurant from its own settings.
 */
export const demo = {
  /** Short code in staff and owner URLs (/h/login) and usernames (h.owner). The route folder is src/app/h, so rename it too. */
  restaurantCode: "h",
  /** "qr": the table comes only from the QR token. "ask": the guest types the table number at checkout. */
  tableMode: "qr" as "qr" | "ask",
  /** A guest session lasts this long and every order extends it. */
  sessionMinutes: 90,
  /** Detailed orders (and the block log) are kept this long. */
  retentionMonths: 12,
  /** Shows the "Demo access" logins on the sign-in page (rendered on the server, see src/lib/auth/accounts.ts). */
  showDemoHint: true,
  /** Orders a guest session may place in any rolling hour. */
  ordersPerHour: 20,
  /** Seconds a guest session must wait between two orders. */
  orderCooldownSeconds: 15,
  /** Wrong PINs before that username + IP is locked, and for how long (checked on the server). */
  maxPinAttempts: 5,
  lockMinutes: 15,
  /** Tables in the restaurant. demo1 to demo5 open tables 1 to 5. */
  tableCount: 12,
} as const;

/** Base path of the staff and owner pages. */
export const basePath = `/${demo.restaurantCode}`;
