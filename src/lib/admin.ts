/** Seller dashboard access — shared by /seller and /admin.
 *
 *  There is no PIN: access is decided purely by who is signed in. The single
 *  store-owner Google account goes straight into the dashboard, and anyone
 *  else (signed out or a different account) is redirected to the storefront
 *  by the route itself — see src/pages/Admin.tsx.
 *
 *  Override via VITE_ADMIN_EMAIL if the owner address ever changes. */
export const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ||
  "minhphuoc.01052016@gmail.com";
