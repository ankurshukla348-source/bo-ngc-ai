// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// Google Sign-In. Credentials are read from the AUTH_GOOGLE_ID and
// AUTH_GOOGLE_SECRET Convex environment variables (Google Cloud Console →
// OAuth client; authorized redirect URI:
//   https://fabulous-yak-430.convex.site/api/auth/callback/google
// ).
// The store owner's Google account is routed to /seller client-side — see
// src/pages/Auth.tsx and src/hooks/use-auth.ts (ADMIN_EMAIL).
//
// The Anonymous provider is deliberately NOT enabled: it would hand every
// visitor a session, making `isAuthenticated` permanently true and turning
// the Google gate (and RequireAuth) into a no-op.

/**
 * Optional strict allow-list of origins the OAuth callback may return to.
 * Set `APP_SITE_URL` (Convex env) to the public URL of this storefront, e.g.
 * `https://your-app.vly.sh`. Multiple origins can be comma-separated.
 */
const ALLOWED_ORIGINS = (process.env.APP_SITE_URL ?? "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const FALLBACK_ORIGIN = "http://localhost:5173";

function isConvexHost(hostname: string): boolean {
  return (
    hostname.endsWith(".convex.site") ||
    hostname.endsWith(".convex.app") ||
    hostname.endsWith(".convex.cloud")
  );
}

/**
 * Resolve where the browser goes after the OAuth round-trip.
 *
 * Convex Auth's default sends the user to `SITE_URL`
 * (https://fabulous-yak-430.convex.site), which serves no frontend and replies
 * with "No matching routes". The client therefore hands us its own origin and
 * we send the browser back to the real app, carrying the `code` param that
 * `ConvexAuthProvider` exchanges for a session.
 *
 * Safety: with `APP_SITE_URL` set, only those origins are honoured. Without
 * it we fall back to accepting the requesting origin, but never a Convex host —
 * that is what produced the original dead-end.
 */
function resolveDestination(redirectTo: string): string {
  // Relative destinations ("/auth") are resolved against an allowed origin.
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    const origin = ALLOWED_ORIGINS[0] ?? FALLBACK_ORIGIN;
    return `${origin}${redirectTo}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectTo);
  } catch {
    return ALLOWED_ORIGINS[0] ?? FALLBACK_ORIGIN;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return ALLOWED_ORIGINS[0] ?? FALLBACK_ORIGIN;
  }

  // Never bounce the user back onto a bare Convex host — that is the page
  // that renders "No matching routes".
  if (isConvexHost(parsed.hostname)) {
    return ALLOWED_ORIGINS[0] ?? FALLBACK_ORIGIN;
  }

  if (ALLOWED_ORIGINS.length > 0) {
    const origin = parsed.origin.replace(/\/+$/, "");
    return ALLOWED_ORIGINS.includes(origin) ? redirectTo : ALLOWED_ORIGINS[0]!;
  }

  return redirectTo;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      return resolveDestination(redirectTo);
    },
  },
});
