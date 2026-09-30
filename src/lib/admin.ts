/** Seller dashboard access — shared by /seller and /admin.
 *
 *  Two independent checks stand between a visitor and the dashboard:
 *
 *   1. Identity — the session must belong to the store owner's Google account
 *      (see ADMIN_EMAIL). Anyone else is redirected to the storefront.
 *   2. The seller PIN — the owner must also type the PIN to unlock the
 *      dashboard for this browser tab session.
 *
 *  Both are client-side by necessity (they gate a page, not an API), and the
 *  real enforcement lives on the Convex side: every seller-only query and
 *  mutation calls `requireOwner` in src/lib/owner.ts. The PIN is a second
 *  layer for shoulder-surfing and stray devices, not a secret — it is
 *  readable in the JS bundle. Set VITE_SELLER_PIN to override the default. */

export const ADMIN_PIN = import.meta.env.VITE_SELLER_PIN?.trim() || "17081503";

/** Store-owner Google account — the only account with seller access. */
export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ||
  "minhphuoc.01052016@gmail.com";

const SESSION_KEY = "mama-seller-pin-ok";

/** Has the owner entered the PIN in this browser session? */
export function hasSellerPin(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Constant-time-ish comparison so the PIN can't be probed by timing. */
export function checkSellerPin(pin: string): boolean {
  const a = pin.trim();
  const b = ADMIN_PIN;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function grantSellerPin(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* sessionStorage unavailable — the in-memory state still holds for this render */
  }
}

export function revokeSellerPin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
