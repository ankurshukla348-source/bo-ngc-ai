/** Seller dashboard access gate — shared by /seller and /admin.
 *
 *  The access code comes from the VITE_SELLER_PIN environment variable
 *  (set it in the project's env/keys settings; it is baked in at build time
 *  by Vite). A built-in fallback keeps local/dev runs working out of the box.
 */

export const ADMIN_PIN = import.meta.env.VITE_SELLER_PIN?.trim() || "246810";

/** Store-owner credentials for the unified login portal: entering these on
 *  /auth signs the owner straight into the dashboard (no PIN prompt).
 *  Override via VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD env vars. */
export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ||
  "minhphuoc.01052016@gmail.com";
export const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD?.trim() || "1708200815032025";

const SESSION_KEY = "mama-admin-unlocked";

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function tryUnlockAdmin(pin: string): boolean {
  if (pin !== ADMIN_PIN) return false;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* sessionStorage unavailable — unlocked state handled in memory */
  }
  return true;
}

export function lockAdmin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
