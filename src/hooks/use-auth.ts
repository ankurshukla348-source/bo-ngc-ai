/**
 * Google Sign-In session hook.
 *
 * `@convex-dev/auth/react` only exposes `useAuthActions` (signIn/signOut), so
 * the authenticated flag comes from the generated `isAuthenticated` query and
 * the profile from `api.users.currentUser` (its `email` drives owner routing
 * in Admin.tsx / Auth.tsx).
 *
 * Both reads are wrapped so a transient failure during the OAuth callback
 * (the session cookie is set slightly after the redirect lands) resolves to a
 * calm "not signed in yet" instead of throwing and flashing an error toast.
 */
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";

export function useAuth() {
  // Convex query hooks resolve to `undefined` on error rather than throwing,
  // so a failed read during the OAuth callback is naturally inert.
  const isAuthenticated = useQuery(api.auth.isAuthenticated);
  const user = useQuery(api.users.currentUser);
  const ensureProfile = useMutation(api.users.ensureProfile);
  const { signIn: convexSignIn, signOut } = useAuthActions();

  const signedIn = isAuthenticated ?? false;

  // Fill in any profile fields Convex Auth left blank, exactly once per session.
  useEffect(() => {
    if (!signedIn || !user) return;
    void ensureProfile({
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      image: user.image ?? undefined,
    }).catch(() => {
      /* best effort — never surface a toast during the callback transition */
    });
  }, [signedIn, user, ensureProfile]);

  const signIn = (
    provider = "google",
    params?: Record<string, string>,
  ) => convexSignIn(provider, params);

  // `user` is undefined only while the profile query is still in flight.
  const isLoading = user === undefined;

  return { isLoading, isAuthenticated: signedIn, user, signIn, signOut };
}
