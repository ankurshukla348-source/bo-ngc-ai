import { v } from "convex/values";
import { requireOwner } from "../lib/owner";
import { mutation, query } from "./_generated/server";

/** Seller's bank account used to build the VietQR code at checkout. */
export const DEFAULT_PAYMENT = {
  key: "payment",
  bankBin: "970436",
  bankName: "Vietcombank",
  accountNo: "000123456789",
  accountHolder: "NGUYEN THI BAO NGOC",
};

/** The seller's bank details.
 *
 *  Owner-only: this is the account number and holder name of the shop's bank
 *  account, and the shop is COD-only, so there is no storefront reason to
 *  publish it. The legacy VietQR branch on the checkout confirmation screen
 *  already degrades to `qrUnavailable` when this query does not resolve. */
export const getPayment = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "payment"))
      .unique();
    if (!row) {
      const { key: _key, ...rest } = DEFAULT_PAYMENT;
      return rest;
    }
    return {
      bankBin: row.bankBin,
      bankName: row.bankName,
      accountNo: row.accountNo,
      accountHolder: row.accountHolder,
    };
  },
});

export const savePayment = mutation({
  args: {
    bankBin: v.string(),
    bankName: v.string(),
    accountNo: v.string(),
    accountHolder: v.string(),
  },
  handler: async (ctx, args) => {
    // Without this guard anyone could repoint the shop's bank account.
    await requireOwner(ctx);
    const fields = {
      bankBin: args.bankBin.trim(),
      bankName: args.bankName.trim(),
      accountNo: args.accountNo.trim(),
      accountHolder: args.accountHolder.trim(),
    };
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "payment"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("settings", { key: "payment", ...fields });
    }
    return { saved: true };
  },
});
