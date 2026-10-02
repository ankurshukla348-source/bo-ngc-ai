/** Store dashboard access — shared by /seller and /admin.
 *
 *  One check stands between a visitor and the dashboard: the session must
 *  belong to the store owner's Google account (see ADMIN_EMAIL). Anyone else
 *  — signed out, or a customer — is redirected to the storefront.
 *
 *  There was also a client-side PIN here. It has been removed: the value
 *  shipped inside the JavaScript bundle, so it was readable by anyone who
 *  opened devtools, and it guarded nothing the server did not already guard.
 *
 *  Access control is enforced server-side, in Convex, by `requireOwner` in
 *  src/lib/owner.ts — every seller-only query and mutation calls it, and it
 *  compares the real authenticated session against OWNER_EMAIL. UI checks are
 *  only ever a convenience: someone bypassing this page gains nothing, because
 *  the data itself is unreachable. */

export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ||
  "minhphuoc.01052016@gmail.com";