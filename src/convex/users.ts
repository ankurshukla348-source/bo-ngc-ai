import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { requireOwner } from "../lib/owner";
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
      const patch: Record<string, string | boolean> = {};
      if (!existing.name && args.name) patch.name = args.name;
      if (!existing.image && args.image) patch.image = args.image;
      if (!existing.email && args.email) patch.email = args.email;
      // Marketing consent defaults to ON: write it once so the record is
      // explicit, but never flip a customer who already opted out.
      if (existing.marketingOptIn === undefined) patch.marketingOptIn = true;
      if (Object.keys(patch).length > 0) {
        try {
          await ctx.db.patch(userId, patch);
          return { created: false, patched: true };
        } catch {
          return { created: false, patched: false };
        }
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
        marketingOptIn: true,
      });
      return { created: true, patched: false };
    } catch {
      return { created: false, patched: false };
    }
  },
});

/**
 * Store the promotional-email choice made at signup / checkout.
 *
 * `optedIn` is written verbatim, so an explicit opt-out is as durable as an
 * opt-in. The whole patch is defensive: a row that vanished mid-session must
 * not take the checkout down with it.
 */
export const setMarketingOptIn = mutation({
  args: { optedIn: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { saved: false };
    try {
      const existing = await ctx.db.get(userId);
      if (!existing) {
        await ctx.db.insert("users", { marketingOptIn: args.optedIn });
        return { saved: true };
      }
      await ctx.db.patch(userId, { marketingOptIn: args.optedIn });
      return { saved: true };
    } catch {
      return { saved: false };
    }
  },
});

/**
 * Recipients for a promotional broadcast.
 *
 * Consent is opt-OUT for accounts: `marketingOptIn === false` is the only value
 * that excludes a customer, so anyone who registered before this field existed
 * (or never explicitly ticked the box) still receives the newsletter.
 *
 * Footer subscribers are merged in, because that form collects an address
 * without an account and is the largest list the shop will have. Someone in
 * both lists appears once — Resend would otherwise be handed the same address
 * twice and could treat it as a duplicate-recipient error.
 *
 * Owner-only: this hands out customer email addresses, so it must never be
 * readable from the public endpoint — only the seller dashboard calls it.
 */
export const marketingAudience = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const users = await ctx.db.query("users").collect();
    const subscribers = await ctx.db.query("subscribers").collect();

    const seen = new Set<string>();
    const recipients: { email: string; name: string | null }[] = [];
    const add = (email: string | undefined | null, name: string | null) => {
      const key = (email ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      recipients.push({ email: key, name });
    };

    // Accounts first: they carry a name, which makes the greeting land.
    for (const user of users) {
      if (user.marketingOptIn === false) continue;
      add(user.email, user.name ?? null);
    }
    for (const row of subscribers) add(row.email, null);

    return recipients;
  },
});
