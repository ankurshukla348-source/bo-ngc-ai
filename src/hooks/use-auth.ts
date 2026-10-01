/** Google Sign-In session hook.
 *
 *  `@convex-dev/auth/react` only exposes `useAuthActions` (signIn/signOut), so
 *  the authenticated flag comes from the generated `isAuthenticated` query and
 *  the profile from `api.users.currentUser` (its `email` drives owner routing
 *  in Admin.tsx / Auth.tsx).
 *
 *  ── Why this hook looks the way it does ──────────────────────────────
 *  Those are TWO independent live queries, and they settle independently:
 *
 *    1. `isAuthenticated` flips to true the moment the session cookie lands.
 *    2. `users.currentUser` only resolves once the profile document is
 *       readable — and Convex Auth writes that row as part of the handshake,
 *       so for a tick after the callback it can still be `null`.
 *
 *  Reading "not signed in" during that window is what made /seller bounce a
 *  freshly signed-in owner straight back to the storefront ("the login glitch
 *  after uploading"), and what left RequireAuth spinning. So the hook reports
 *  the two states separately:
 *
 *    isLoading         → the session query has not settled yet
 *    isProfileLoading  → signed in, but the profile row has not resolved yet
 *    isAuthenticated   → true only when the session query says so
 *
 *  Screens that decide *who* you are (the seller identity check, the policy
 *  gate) must wait for `isProfileLoading` as well; screens that only need
 *  "signed in or not" can use `isAuthenticated` immediately.
 *
 *  `ensureProfile` is fired for every signed-in session — including when the
 *  profile row is missing, which is precisely the state that needs repairing —
 *  and is de-duplicated per profile so the many mounted copies of this hook do
 *  not fire a burst of identical mutations.
 */
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";

/** Profiles already repaired in this tab, so N mounted hooks => 1 mutation. */
const ensuredProfiles = new Set<string>();

/** How long a screen waits for the profile row before deciding anyway.
 *
 *  A Convex query that errors stays `undefined` forever, so waiting on the
 *  profile can never be unbounded — after this grace period the screens fall
 *  back to the session flag instead of showing a permanent spinner. */
const PROFILE_GRACE_MS = 2500;

export function useAuth() {
  // Convex query hooks resolve to `undefined` while loading *and* on error,
  // so a transient failure during the OAuth callback stays inert instead of
  // throwing and flashing an error toast.
  const session = useQuery(api.auth.isAuthenticated);
  const profile = useQuery(api.users.currentUser);
  const ensureProfile = useMutation(api.users.ensureProfile);
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  const isAuthenticated = session === true;
  const user = profile ?? null;
  const isLoading = session === undefined;

  // Grace window for the profile row, see PROFILE_GRACE_MS.
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || profile !== undefined) {
      setProfileTimedOut(false);
      return;
    }
    const timer = setTimeout(
      () => setProfileTimedOut(true),
      PROFILE_GRACE_MS,
    );
    return () => clearTimeout(timer);
  }, [isAuthenticated, profile]);

  const isProfileLoading =
    isAuthenticated && profile === undefined && !profileTimedOut;

  // Keyed by the resolved profile id, so a brand-new sign-in always gets one
  // repair attempt even if this tab already handled a previous account.
  const profileKey = user?._id ?? (isAuthenticated ? "pending" : null);

  useEffect(() => {
    if (!profileKey || ensuredProfiles.has(profileKey)) return;
    // Claim the key before awaiting: several copies of this hook mount on the
    // same route, and only one should run the mutation.
    ensuredProfiles.add(profileKey);
    void ensureProfile({
      name: user?.name ?? undefined,
      email: user?.email ?? undefined,
      image: user?.image ?? undefined,
    }).catch(() => {
      // Release the claim so a later render can retry.
      ensuredProfiles.delete(profileKey);
    });
  }, [profileKey, user, ensureProfile]);

  const signIn = useCallback(
    (provider = "google", params?: Record<string, string>) =>
      convexSignIn(provider, params),
    [convexSignIn],
  );

  const signOut = useCallback(async () => {
    ensuredProfiles.clear();
    await convexSignOut();
  }, [convexSignOut]);

  return { isLoading, isProfileLoading, isAuthenticated, user, signIn, signOut };
}