// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// ── Google Sign-In ────────────────────────────────────────────────────────
//
// Credentials: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (Convex env).
//
// The OAuth *redirect_uri* registered in Google Cloud Console is:
//
//   https://fabulous-yak-430.convex.site/api/auth/callback/google
//
// That is an INBOUND endpoint — Google sends the browser there and Convex
// Auth's `/api/auth/callback/` route (registered via addHttpRoutes) completes
// the handshake. It is NOT a destination we send users to.
//
// IMPORTANT: `SITE_URL` (https://fabulous-yak-430.convex.site) is the Convex
// HTTP host and serves ONLY /api/auth/* and /.well-known/*. Every other path
// there answers "No matching routes found" — verified for "/", "/seller" and
// "/auth". So the storefront is NEVER hosted on that domain, and we must never
// redirect a signed-in user onto it. The browser is returned to the origin the
// visitor actually came from (sent by the client as `redirectTo`).
//
// The Anonymous provider is deliberately NOT enabled: it would hand every
// visitor a session, making `isAuthenticated` permanently true and turning
// the Google gate (and RequireAuth) into a no-op.

/**
 * Optional strict allow-list of storefront origins from the `APP_SITE_URL`
 * Convex env var (comma-separated), e.g. "https://shop.example.com".
 * When set, ONLY these origins are accepted. Leave unset to trust the origin
 * the request was actually initiated from.
 *
 * Every entry is validated: a malformed value (e.g. a pasted markdown link
 * such as "[https://x](https://x)") is discarded with a warning rather than
 * being used as a redirect target.
 */
const PINNED_ORIGINS = (process.env.APP_SITE_URL ?? "")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter((value) => {
    if (!value) return false;
    try {
      const { protocol } = new URL(value);
      return protocol === "https:" || protocol === "http:";
    } catch {
      logWarn(`Ignoring malformed APP_SITE_URL entry: ${value}`);
      return false;
    }
  });

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

/**
 * Last-resort base, used only when the request carried no usable origin.
 * Deliberately NOT hardcoded to localhost — a production visitor must never be
 * bounced to a dev machine ("localhost refused to connect").
 */
function fallbackOrigin(): string {
  if (PINNED_ORIGINS.length > 0) return PINNED_ORIGINS[0]!;
  // Nothing pinned — this only runs if the request carried no usable origin.
  // SITE_URL is validated too, so a malformed value can never be emitted as a
  // Location header. We never fall back to localhost: a production visitor
  // must not be bounced to a developer's machine.
  const site = (process.env.SITE_URL ?? "").trim();
  try {
    if (site) {
      const parsed = new URL(site);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return `${parsed.origin}/`;
      }
    }
  } catch {
    logWarn(`Ignoring malformed SITE_URL: ${site}`);
  }
  return "https://fabulous-yak-430.convex.site/";
}

/** May the browser be returned to this absolute origin? */
function isAllowedOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  // The Convex HTTP host has no frontend: it is the "No matching routes" 404.
  // This runs before the allow-list so a misconfigured APP_SITE_URL can never
  // re-open the dead-end.
  if (isConvexHost(parsed.hostname)) return false;
  if (PINNED_ORIGINS.length > 0) return PINNED_ORIGINS.includes(origin);
  return true;
}

/**
 * Resolve where the browser goes once the OAuth handshake is done.
 *
 * The client always sends `${window.location.origin}/auth`, so this echoes the
 * origin back — that is what makes the redirect follow whichever deployment the
 * visitor is on (local dev, preview, or production) with no hardcoded host.
 */
function resolveDestination(redirectTo: string): string {
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
  if (!isAllowedOrigin(origin)) {
    logWarn(`Rejected post-login redirect to ${origin}`);
    return fallbackOrigin();
  }
  return `${origin}${parsed.pathname}${parsed.search}`;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    /**
     * Runs after `/api/auth/callback/<provider>` completes. Returns the browser
     * to the storefront it came from, carrying the `code` param that
     * `ConvexAuthProvider` (src/main.tsx) exchanges for a session.
     */
    async redirect({ redirectTo }) {
      return resolveDestination(redirectTo);
    },
  },
});
