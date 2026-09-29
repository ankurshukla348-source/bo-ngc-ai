// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// ── Google Sign-In ────────────────────────────────────────────────────────
//
// Credentials come from the AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET Convex env
// vars.
//
// The OAuth *redirect_uri* registered in Google Cloud Console is:
//
//   https://fabulous-yak-430.convex.site/api/auth/callback/google
//
// That URL is an INBOUND endpoint: Google sends the browser there, and
// Convex Auth's `/api/auth/callback/` route (registered by addHttpRoutes below)
// completes the handshake. It is NOT a place to send the user afterwards.
//
// `SITE_URL` (https://fabulous-yak-430.convex.site) is the Convex HTTP host.
// It serves ONLY these auth endpoints — a request to its root answers
// "No matching routes found". So after the handshake the browser must be sent
// to the storefront's own origin, never back to SITE_URL.
//
// The Anonymous provider is deliberately NOT enabled: it would hand every
// visitor a session, making `isAuthenticated` permanently true and turning
// the Google gate (and RequireAuth) into a no-op.

/**
 * Optional strict allow-list of storefront origins, from the `APP_SITE_URL`
 * Convex env var (comma-separated, e.g. "https://shop.vly.sh,https://shop.com").
 *
 * When set, ONLY these origins are accepted. Leave it unset to fall back to
 * the platform defaults below (the Freebuff preview host + local dev).
 */
const PINNED_ORIGINS = (process.env.APP_SITE_URL ?? "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/** Local dev servers, only ever reached from a developer's own machine. */
const DEV_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

/** Freebuff/Vly preview + published storefront hosts. */
const APP_HOST_SUFFIXES = [".vly.sh", ".freebuff.com"];

function logWarn(message: string): void {
  console.warn(`[auth] ${message}`);
}

function isConvexHost(hostname: string): boolean {
  return (
    hostname === "convex.site" ||
    hostname.endsWith(".convex.site") ||
    hostname.endsWith(".convex.app") ||
    hostname.endsWith(".convex.cloud")
  );
}

/** Last-resort base when we have nothing better — still never a Convex host. */
function fallbackOrigin(): string {
  if (PINNED_ORIGINS.length > 0) return PINNED_ORIGINS[0]!;
  const site = process.env.SITE_URL;
  if (site && !isConvexHost(new URL(site).hostname)) {
    return site.replace(/\/+$/, "");
  }
  return "http://localhost:5173";
}

/**
 * True when the configured allow-list points at a Convex host, which would
 * send every visitor to the "No matching routes" dead-end.
 */
function allowListIsMisconfigured(): boolean {
  return PINNED_ORIGINS.some((origin) => {
    try {
      return isConvexHost(new URL(origin).hostname);
    } catch {
      return false;
    }
  });
}

/** Decide whether the browser may be returned to `origin`. */
function isAllowedOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  // Never bounce back to a bare Convex host — that host answers
  // "No matching routes found" for every path but /api/auth/*. This check runs
  // BEFORE the allow-list so a misconfigured APP_SITE_URL can never re-open
  // the dead-end it was meant to close.
  if (isConvexHost(parsed.hostname)) return false;
  if (PINNED_ORIGINS.length > 0) return PINNED_ORIGINS.includes(origin);
  if (DEV_ORIGINS.has(origin)) return true;
  return (
    parsed.protocol === "https:" &&
    APP_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix))
  );
}

/**
 * Resolve where the browser goes once the OAuth handshake is done.
 *
 * The client always sends an absolute `{origin}/auth`, so this normally just
 * echoes it back — that is what makes the redirect follow whichever deployment
 * the visitor is actually using (local dev, preview, or production) instead of
 * a hardcoded host.
 */
function resolveDestination(redirectTo: string): string {
  // Relative destinations are resolved against an approved origin.
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    return `${fallbackOrigin()}${redirectTo}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectTo);
  } catch {
    return fallbackOrigin();
  }

  const origin = parsed.origin.replace(/\/+$/, "");
  return isAllowedOrigin(origin)
    ? `${origin}${parsed.pathname}${parsed.search}`
    : fallbackOrigin();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    /**
     * Runs after `/api/auth/callback/<provider>` completes. Sends the browser
     * back to the storefront it came from, carrying the `code` param that
     * `ConvexAuthProvider` (src/main.tsx) exchanges for a session.
     */
    async redirect({ redirectTo }) {
      if (allowListIsMisconfigured()) {
        logWarn(
          "APP_SITE_URL points at a Convex host; falling back to origin-based " +
            "resolution. Set APP_SITE_URL to the storefront's public URL.",
        );
      }
      return resolveDestination(redirectTo);
    },
  },
});
