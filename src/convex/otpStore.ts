import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/** OTP record storage — default runtime (DB access only, no node APIs).
 *  Hashing/email/actions live in authService.ts ("use node"). */

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const issueOtp = internalMutation({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("register"), v.literal("reset")),
    codeHash: v.string(),
  },
  handler: async (ctx, { email, purpose, codeHash }) => {
    const normalized = email.trim().toLowerCase();
    // Invalidate any outstanding code for this email+purpose.
    const stale = await ctx.db
      .query("otpCodes")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", normalized).eq("purpose", purpose),
      )
      .collect();
    for (const row of stale) await ctx.db.delete(row._id);
    await ctx.db.insert("otpCodes", {
      email: normalized,
      purpose,
      codeHash,
      attempts: 0,
      expiresAt: Date.now() + OTP_TTL_MS,
      consumed: false,
      createdAt: Date.now(),
    });
  },
});

export const verifyOtpRecord = internalMutation({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("register"), v.literal("reset")),
    inputCodeHash: v.string(),
  },
  handler: async (ctx, { email, purpose, inputCodeHash }) => {
    const normalized = email.trim().toLowerCase();
    const row = await ctx.db
      .query("otpCodes")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", normalized).eq("purpose", purpose),
      )
      .unique();
    if (!row) {
      return { ok: false as const, reason: "No code was requested for this email." };
    }
    if (row.consumed) {
      return { ok: false as const, reason: "This code was already used." };
    }
    if (Date.now() > row.expiresAt) {
      return { ok: false as const, reason: "This code has expired — request a new one." };
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false as const, reason: "Too many attempts — request a new code." };
    }
    if (row.codeHash !== inputCodeHash) {
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return { ok: false as const, reason: "Incorrect code — please try again." };
    }
    return { ok: true as const };
  },
});

/** Public wrapper the client calls to request a 6-digit OTP; schedules the
 *  node-runtime send action (Resend email) in authService.ts. */
export const requestOtp = mutation({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("register"), v.literal("reset")),
  },
  handler: async (ctx, { email, purpose }) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw new Error("Email không hợp lệ.");
    await ctx.scheduler.runAfter(0, internal.authService.requestOtpAction, {
      email: normalized,
      purpose,
    });
    return { scheduled: true as const };
  },
});

/** Verify + consume in one step (consume only on success). Runs in the
 *  default runtime so the DB read, patch and verdict share one transaction. */
export const consumeOtpRecord = internalMutation({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("register"), v.literal("reset")),
    inputCodeHash: v.string(),
  },
  handler: async (ctx, { email, purpose, inputCodeHash }) => {
    const normalized = email.trim().toLowerCase();
    const row = await ctx.db
      .query("otpCodes")
      .withIndex("by_email_purpose", (q) =>
        q.eq("email", normalized).eq("purpose", purpose),
      )
      .unique();
    if (!row) {
      return { ok: false as const, reason: "No code was requested for this email." };
    }
    if (row.consumed) {
      return { ok: false as const, reason: "This code was already used." };
    }
    if (Date.now() > row.expiresAt) {
      return { ok: false as const, reason: "This code has expired — request a new one." };
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false as const, reason: "Too many attempts — request a new code." };
    }
    if (row.codeHash !== inputCodeHash) {
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return { ok: false as const, reason: "Incorrect code — please try again." };
    }
    await ctx.db.patch(row._id, { consumed: true });
    return { ok: true as const };
  },
});
