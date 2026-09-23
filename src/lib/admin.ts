/** Simple seller PIN gate for /admin — the v1 decision is a hardcoded PIN
 *  instead of a full auth provider. Change ADMIN_PIN here. */
export const ADMIN_PIN = "8888";

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
