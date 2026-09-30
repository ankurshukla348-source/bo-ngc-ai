/**
 * Server-side request throttling.
 *
 * The public checkout and the live-chat widget are open to anyone, so both
 * writes go through `allowRequest`, which counts recent requests per key in the
 * `throttle` table. Rows older than the window are pruned on write, so the
 * table stays small and needs no sweeper job.
 *
 * Keys and limits come from src/lib/antiSpam.ts, so the browser and the server
 * agree on what is being limited.
 */
import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

/** The real mutation context, so callers pass their own ctx straight in. */
type Ctx = GenericMutationCtx<DataModel>;

/**
 * Records a request and reports whether it is inside the limit.
 *
 * Returns false when `key` already made `limit.max` requests inside
 * `limit.windowMs`. The rejected request is not recorded, so a client that
 * keeps hammering cannot push its own window forward.
 */
export async function allowRequest(
  ctx: Ctx,
  key: string,
  limit: { max: number; windowMs: number },
): Promise<boolean> {
  const now = Date.now();
  const since = now - limit.windowMs;

  const rows = await ctx.db
    .query("throttle")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();

  // Prune first, so the table only ever holds the live window.
  const live = rows.filter((row) => row.at >= since);
  for (const row of rows) {
    if (row.at < since) await ctx.db.delete(row._id);
  }
  if (live.length >= limit.max) return false;

  await ctx.db.insert("throttle", { key, at: now });
  return true;
}

/** Request count for a key inside a window — used by the test suite. */
export const recentCount = query({
  args: { key: v.string(), windowMs: v.number() },
  handler: async (ctx, args) => {
    const since = Date.now() - args.windowMs;
    const rows = await ctx.db
      .query("throttle")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .filter((q) => q.gte(q.field("at"), since))
      .collect();
    return { count: rows.length };
  },
});
