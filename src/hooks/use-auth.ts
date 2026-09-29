/**
 * Google Sign-In session hook.
 *
 * Wraps Convex Auth: `useConvexAuth` gives the loading/authenticated flags,
 * `api.users.currentUser` resolves the signed-in profile (email → owner routing
 * in Admin.tsx / Auth.tsx), and `useAuthActions().signIn/signOut` drive the
 * OAuth redirect flows.
 */
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function useAuth() {
  const isAuthenticated = useQuery(api.auth.isAuthenticated) ?? false;
  const user = useQuery(api.users.currentUser);
  const { signIn: convexSignIn, signOut } = useAuthActions();

  const signIn = (provider = "google") => convexSignIn(provider);

  // `user` is undefined only while the profile query is still in flight.
  const isLoading = user === undefined;

  return { isLoading, isAuthenticated, user, signIn, signOut };
}
