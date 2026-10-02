/**
 * Newsletter subscribers from the footer form.
 *
 * Public and unauthenticated — a shopper typing an address into the footer is
 * not signed in — so this is the one write in the store that anyone can make.
 * It is therefore deliberately dull: an idempotent upsert keyed by the
 * lower-cased address, rate-limited per address, and validated before insert.
 * It stores an address and nothing else, so a spam hit costs one row.
 */
import { v } from "convex/values";
import {
  NEWSLETTER_LIMIT,
  isHoneypotTripped,
  newsletterThrottleKey,
} from "../lib/antiSpam";
import { requireOwner } from "../lib/owner";
import { mutation, query } from "./_generated/server";
import { allowRequest } from "./throttle";

/** Deliberately permissive but structural: catches typos, not valid addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Long enough for any real mailbox, short enough to reject pasted garbage. */
const MAX_EMAIL = 254;

/**
 * Add an address to the newsletter list.
 *
 * `already` is returned separately from the success flag so the form can show
 * the same friendly confirmation for a repeat signup instead of an error —
 * re-submitting an address must never look like a failure to the shopper, and
 * must never create a duplicate row either.
 */
export const subscribe = mutation({
  args: {
    email: v.string(),
    /** Hidden field; a filled value means a bot submitted the form. */
    website: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // A tripped honeypot still answers "success". Telling a bot it was
    // detected only teaches it what to avoid.
    if (isHoneypotTripped(args.website)) {
      return { ok: true as const, already: false };
    }

    const email = args.email.trim().toLowerCase();
    if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return { ok: false as const, reason: "bad_email" as const };
    }

    const allowed = await allowRequest(
      ctx,
      newsletterThrottleKey(email),
      NEWSLETTER_LIMIT,
    );
    if (!allowed) return { ok: false as const, reason: "rate_limited" as const };

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) return { ok: true as const, already: true };

    await ctx.db.insert("subscribers", {
      email,
      createdAt: Date.now(),
      ...(args.source ? { source: args.source.slice(0, 40) } : {}),
    });
    return { ok: true as const, already: false };
  },
});

/**
 * Every subscriber, newest first.
 *
 * Owner-only: this is a list of customer email addresses, so it must never be
 * readable from a public endpoint.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("subscribers").collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        id: row._id,
        email: row.email,
        createdAt: row.createdAt,
        source: row.source ?? null,
      }));
  },
});

/** Remove one address. The escape hatch for a delete request. */
export const remove = mutation({
  args: { id: v.id("subscribers") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    await ctx.db.delete(args.id);
    return { removed: true };
  },
});