import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

/** All customer-account reads/writes run in the default runtime. Hashing and
 *  email delivery live in the node runtime (see authService.ts). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());

/** Does an account exist for this email? Drives the unified login's
 *  password-first vs. OTP-registration branching. */
export const existsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    return row !== null;
  },
});

export const profileByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    if (!row) return null;
    return { email: row.email, name: row.name ?? null, createdAt: row.createdAt };
  },
});

/** Create the account. Called only after a verified register-OTP. */
export const createAccount = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, passwordHash, salt, name }) => {
    const normalized = normalizeEmail(email);
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) throw new Error("An account with this email already exists.");
    return await ctx.db.insert("customers", {
      email: normalized,
      ...(name?.trim() ? { name: name.trim() } : {}),
      passwordHash,
      salt,
      createdAt: Date.now(),
    });
  },
});

/** Password change (registration completion or reset). */
export const setPassword = internalMutation({
  args: { email: v.string(), passwordHash: v.string(), salt: v.string() },
  handler: async (ctx, { email, passwordHash, salt }) => {
    const normalized = normalizeEmail(email);
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!row) throw new Error("No account found for this email.");
    await ctx.db.patch(row._id, { passwordHash, salt });
  },
});

/** Internal: hash material for password verification (node action calls this). */
export const credentialsInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    if (!row) return null;
    return { passwordHash: row.passwordHash, salt: row.salt };
  },
});

/** Public variant (kept for tooling/debugging; not used by the UI). */
export const credentialsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique();
    if (!row) return null;
    return { passwordHash: row.passwordHash, salt: row.salt };
  },
});

/** Update the display name. */
export const updateName = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const normalized = normalizeEmail(email);
    const row = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!row) throw new Error("No account found for this email.");
    await ctx.db.patch(row._id, { name: name.trim() });
  },
});
