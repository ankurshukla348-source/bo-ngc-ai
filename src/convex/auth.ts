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
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});
