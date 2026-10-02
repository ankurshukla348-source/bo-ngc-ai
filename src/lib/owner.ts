/**
 * Server-side owner guard.
 *
 * The /seller screen is already gated in the UI (owner Google session + PIN),
 * but UI gating is not access control: anyone can POST straight at a Convex
 * mutation with the browser devtools open. Every seller-only query and
 * mutation calls `requireOwner` so a customer session can never read orders,
 * edit the catalogue or moderate chat.
 *
 * NOTE: the owner address is hardcoded here on purpose. Convex bundles these
 * functions with esbuild, where `import.meta.env` does not exist — reading
 * VITE_ADMIN_EMAIL from a Convex function would throw at runtime. Keep this in
 * sync with src/lib/admin.ts.
 */
import { getAuthUserId } from "@convex-dev/auth/server";

export const OWNER_EMAIL = "minhphuoc.01052016@gmail.com";

/** Derived from getAuthUserId so it stays correct across Convex versions. */
type AuthCtx = Parameters<typeof getAuthUserId>[0];

/**
 * The smallest reader surface this guard needs. Declared structurally because
 * `getAuthUserId` only asks for `{ auth }`, while a real query/mutation ctx
 * also carries `db`.
 */
type OwnerDoc = { email?: string | null } | null;
type DbCtx = AuthCtx & { db: { get: (id: string) => Promise<OwnerDoc> } };

/** True when the current session belongs to the store owner. */
export async function isOwner(ctx: AuthCtx): Promise<boolean> {
  try {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await (ctx as DbCtx).db.get(userId);
    return (user?.email ?? "").trim().toLowerCase() === OWNER_EMAIL;
  } catch {
    return false;
  }
}

/** Throws unless the caller is the store owner. */
export async function requireOwner(ctx: AuthCtx): Promise<void> {
  if (!(await isOwner(ctx))) {
    throw new Error("Not authorized");
  }
}
