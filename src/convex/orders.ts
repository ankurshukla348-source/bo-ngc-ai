import { v } from "convex/values";
import { shippingFeeFor } from "../lib/catalog";
import { mutation, query } from "./_generated/server";

/** Order lines only keep real image URLs. Inline `data:` artwork (placeholder
 *  SVGs) and anything oversized are dropped so an order document can never
 *  fail on size — the storefront re-derives the image from the product. */
function safeImageSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (!/^https?:\/\//i.test(src)) return undefined;
  return src.slice(0, 500);
}

/**
 * Create an order and mint a unique, human-facing order ID.
 *
 * Prices and shipping are recomputed server-side from the current catalogue,
 * so a stale cart can never underpay. Falls back to the client-sent price if
 * the product has since been deleted.
 */
export const create = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.string(),
        nameVi: v.string(),
        nameEn: v.string(),
        price: v.number(),
        size: v.string(),
        qty: v.number(),
        imageSrc: v.optional(v.string()),
      }),
    ),
    customer: v.object({
      name: v.string(),
      phone: v.string(),
      province: v.string(),
      district: v.string(),
      ward: v.string(),
      street: v.string(),
      note: v.optional(v.string()),
    }),
    paymentMethod: v.union(
      v.literal("vietqr"),
      v.literal("cod"),
      v.literal("wallet"),
    ),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) throw new Error("Cart is empty");

    const customer = {
      name: args.customer.name.trim(),
      phone: args.customer.phone.trim(),
      province: args.customer.province.trim(),
      district: args.customer.district.trim(),
      ward: args.customer.ward.trim(),
      street: args.customer.street.trim(),
      ...(args.customer.note?.trim() ? { note: args.customer.note.trim() } : {}),
    };
    if (
      !customer.name ||
      !customer.phone ||
      !customer.province ||
      !customer.district ||
      !customer.ward ||
      !customer.street
    ) {
      throw new Error("Shipping address is incomplete");
    }

    // Recompute prices against the live catalogue.
    const items = [];
    let subtotal = 0;
    for (const item of args.items) {
      const qty = Math.max(1, Math.round(item.qty));
      const normalizedId = ctx.db.normalizeId("products", item.productId);
      const product = normalizedId ? await ctx.db.get(normalizedId) : null;
      const price = product ? product.price : Math.max(0, Math.round(item.price));
      const nameVi = product ? product.nameVi : item.nameVi;
      const nameEn = product ? product.nameEn : item.nameEn;
      subtotal += price * qty;
      const imageSrc = safeImageSrc(item.imageSrc);
      items.push({
        productId: item.productId,
        nameVi,
        nameEn,
        price,
        size: item.size,
        qty,
        ...(imageSrc ? { imageSrc } : {}),
      });
    }

    const shippingFee = shippingFeeFor(subtotal);
    const total = subtotal + shippingFee;
    const createdAt = Date.now();

    // Unique order ID: BN-YYMMDD-XXXX, retried against the by_code index.
    const d = new Date(createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp =
      String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
    let orderCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      const candidate = `BN-${stamp}-${suffix}`;
      const taken = await ctx.db
        .query("orders")
        .withIndex("by_code", (q) => q.eq("orderCode", candidate))
        .unique();
      if (!taken) {
        orderCode = candidate;
        break;
      }
    }
    if (!orderCode) throw new Error("Could not allocate an order ID");

    await ctx.db.insert("orders", {
      orderCode,
      status: "new",
      items,
      customer,
      paymentMethod: args.paymentMethod,
      subtotal,
      shippingFee,
      total,
      createdAt,
    });

    return { orderCode, subtotal, shippingFee, total, createdAt };
  },
});

/** Newest orders first — available for a future order-history view. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("orders")
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
  },
});
