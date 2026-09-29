/** Client-side session for storefront customer accounts.
 *
 *  Accounts (email + scrypt-hashed password) live in Convex (`customers`).
 *  After a successful password check / registration the client keeps a small
 *  session record here so refreshes keep the customer signed in. This is a
 *  storefront convenience session — not an auth token; privileged data is
 *  never gated on it. */

import { ADMIN_EMAIL } from "./admin";

export type CustomerSession = {
  email: string;
  name: string | null;
  loggedInAt: number;
};

const SESSION_KEY = "baongoc-customer-session";

export function readSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession | null;
    if (!parsed || typeof parsed.email !== "string") return null;
    // The owner account never keeps a storefront session — /seller has its own.
    if (parsed.email === ADMIN_EMAIL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: CustomerSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
