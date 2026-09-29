import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAuthActions, useConvexAuth, useQuery } from "@convex-dev/auth/react";
import { useCallback, useMemo } from "react";

/** The Convex `users` row (Google profile: name, email, image). */
export type AuthUser = Pick<Doc<"users">, "name" | "email" | "image"> & {
  _id: Doc<"users">["_id"];
};

/**
 * Storefront auth — Google Sign-In via Convex Auth.
 *
 * Wraps @convex-dev/auth's useConvexAuth in the same shape the app already
 * consumes (isLoading / isAuthenticated / user / signOut) so RequireAuth,
 * the Header and the Dashboard keep working unchanged.
 *
 * Admin routing (minhphuoc.01052016@gmail.com → /seller) happens on the
 * auth page after signIn resolves — the owner is just another user row here.
 */
export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions();

  // Reactive user profile; null while signed out. During the initial
  // load `isLoading` is true, so consumers show a spinner instead of
  // flashing the signed-out UI.
  const currentUser = useQuery(api.users.currentUser);

  const user: AuthUser | null = isAuthenticated
    ? ((currentUser ?? null) as AuthUser | null)
    : null;

  const signOut = useCallback(async () => {
    await convexSignOut();
  }, [convexSignOut]);

  const signInWithGoogle = useCallback(() => {
    // Redirects the browser to Google's consent screen; the Convex Auth
    // callback completes sign-in before returning to this app.
    void signIn("google");
  }, [signIn]);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      signIn: signInWithGoogle,
      signOut,
    }),
    [isLoading, isAuthenticated, user, signInWithGoogle, signOut],
  );
}
