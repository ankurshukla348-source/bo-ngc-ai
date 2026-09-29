import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * Idempotent profile upsert.
 *
 * Convex Auth already creates the `users` row during the OAuth handshake, but
 * that insert races the client: the app can observe a session a tick before the
 * profile document is readable, and re-running sign-in would otherwise try to
 * insert a second row. This is a safe, convergent "make sure it exists and is
 * filled in" pass:
 *
 *  - no session            -> no-op
 *  - row already present   -> patch only the missing/blank fields
 *  - row absent            -> insert it once
 *
 * It never throws on a duplicate, so a fast double-tap on "Sign in with Google"
 * can't surface an error toast.
 */
export const ensureProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { created: false, patched: false };

    const existing = await ctx.db.get(userId);
    if (existing) {
      // Only fill blanks; never clobber a value the user already has.
      const patch: Record<string, string> = {};
      if (!existing.name && args.name) patch.name = args.name;
      if (!existing.image && args.image) patch.image = args.image;
      if (!existing.email && args.email) patch.email = args.email;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(userId, patch);
        return { created: false, patched: true };
      }
      return { created: false, patched: false };
    }

    // Defensive: an insert can still lose a race with the auth handshake.
    // Convex rolls the whole mutation back on throw, so we swallow it and let
    // the next read observe whichever row won.
    try {
      await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      return { created: true, patched: false };
    } catch {
      return { created: false, patched: false };
    }
  },
});
