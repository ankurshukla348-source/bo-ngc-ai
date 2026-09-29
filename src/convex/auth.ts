// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

// The built-in Freebuff email-OTP provider has been removed: all storefront
// transactional emails (login/register/reset codes) are delivered strictly
// through the Resend API — see src/convex/authService.ts (RESEND_API_KEY).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous],
});