// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

// Google Sign-In. Credentials are read from the AUTH_GOOGLE_ID and
// AUTH_GOOGLE_SECRET Convex environment variables (Google Cloud Console →
// OAuth client; authorized redirect URI:
//   https://fabulous-yak-430.convex.site/api/auth/callback/google
// ). The store owner's Google account is routed to /seller client-side —
// see src/pages/Auth.tsx and src/hooks/use-auth.ts (ADMIN_EMAIL).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
});
