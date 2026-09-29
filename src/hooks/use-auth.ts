import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback, useMemo } from "react";
import {
  readSession,
  writeSession,
  clearSession,
  type CustomerSession,
} from "@/lib/customer-session";

/**
 * Storefront auth — now backed by the project's own customer accounts
 * (email + password via Convex `customers`, OTP delivery through Resend)
 * instead of the platform's email-OTP provider.
 *
 * Keeps the same shape the rest of the app already consumes
 * (isLoading / isAuthenticated / user / signIn / signOut) so RequireAuth,
 * Dashboard and the Header keep working unchanged.
 */
export function useAuth() {
  const session = readSession();
  // Reactive profile (name updates) for the logged-in customer.
  const profile = useQuery(
    api.customers.profileByEmail,
    session ? { email: session.email } : "skip",
  );

  const isAuthenticated = session !== null;

  const user = useMemo(() => {
    if (!session) return null;
    return {
      email: session.email,
      name: profile?.name ?? session.name ?? undefined,
    };
  }, [session, profile]);

  /** Kept for compatibility with existing callers. The only remaining use is
   *  guest (anonymous) sign-in; email flows use the authService actions. */
  const signIn = useCallback(
    async (_provider: string, _formData?: FormData) => {
      throw new Error("Use the authService actions for email sign-in.");
    },
    [],
  );

  const signOut = useCallback(async () => {
    clearSession();
  }, []);

  const startSession = useCallback((next: CustomerSession) => {
    writeSession(next);
    // Re-render consumers by touching nothing else — callers navigate right
    // after this, and the next mount re-reads the session.
  }, []);

  return {
    isLoading: false,
    isAuthenticated,
    user,
    session,
    startSession,
    signIn,
    signOut,
  };
}
