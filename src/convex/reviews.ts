import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { normalizeStatus } from "../lib/orders";
import { requireOwner } from "../lib/owner";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Photo ids are stored as plain strings; storage helpers want a typed id. */
const asStorageId = (value: string) => value as Id<"_storage">;

/**
 * Customer reviews with optional photos.
 *
 * ── Eligibility ─────────────────────────────────────────────────────────
 * A review is only accepted for a product the customer actually RECEIVED:
 * the reviewer must have a signed-in account, and one of their orders must
 * contain the product and be in a delivered state. Everything else — a random
 * signed-in visitor, a customer's own undelivered order, a deleted product —
 * is refused.
 *
 * Deliberately signed-in only. Most orders on a COD shop are placed as guests,
 * so the review prompt lives in the customer's account area where a session
 * exists; the guest path stays exactly as frictionless as checkout.
 */
const MAX_TEXT = 2000;
const MAX_PHOTOS = 4;
const MAX_RATING = 5;

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, MAX_TEXT);
  return trimmed ? trimmed : undefined;
}

export const MAX_REVIEW_PHOTOS = MAX_PHOTOS;

/** Reviews for a product, newest first, each with resolved photo URLs. */
export const forProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(100);

    return await Promise.all(
      rows.map(async (row) => {
        // A photo whose blob was deleted must not break the whole list.
        const photos = await Promise.all(
          (row.photos ?? []).map(async (id) => {
            try {
              return await ctx.storage.getUrl(asStorageId(id));
            } catch {
              return null;
            }
          }),
        );
        const author = await ctx.db.get(row.userId);
        const name = (author?.name ?? "").trim();
        return {
          _id: row._id,
          rating: row.rating,
          text: row.text ?? "",
          photos: photos.filter((url): url is string => !!url),
          createdAt: row.createdAt,
          // First name + last initial only. A review is public, and a customer
          // order form collects far more identifying detail than that.
          author: name ? `${name.split(/\s+/)[0]} ${name.split(/\s+/).slice(1).map((p) => p[0] ?? "").join(".")}`.trim() : "Khách hàng",
          verified: row.orderId !== undefined,
        };
      }),
    );
  },
});

/** Aggregate rating + count, for the product card and quick view. */
export const summary = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    if (rows.length === 0) return { average: 0, count: 0 };
    const total = rows.reduce((sum, row) => sum + (row.rating || 0), 0);
    return {
      average: Math.round((total / rows.length) * 10) / 10,
      count: rows.length,
    };
  },
});

/**
 * Products the signed-in customer may review: those in an order of theirs that
 * reached a delivered state, minus the ones already reviewed.
 */
export const reviewable = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const seen = new Set<string>();
    const out: Array<{
      productId: Id<"products">;
      nameVi: string;
      nameEn: string;
      image: string | null;
      deliveredAt: number;
      orderId: Id<"orders">;
      reviewed: boolean;
    }> = [];

    for (const order of orders) {
      if (normalizeStatus(order.status) !== "delivered") continue;
      for (const item of order.items ?? []) {
        const productId = ctx.db.normalizeId("products", item.productId);
        if (!productId || seen.has(productId)) continue;
        seen.add(productId);

        const product = await ctx.db.get(productId);
        // The product may have been deleted after the order was delivered.
        if (!product) continue;

        const existing = await ctx.db
          .query("reviews")
          .withIndex("by_product", (q) => q.eq("productId", productId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        out.push({
          productId,
          nameVi: product.nameVi ?? item.nameVi ?? "Sản phẩm",
          nameEn: product.nameEn ?? item.nameEn ?? "Product",
          image: product.imageSrc ?? null,
          deliveredAt: order.createdAt,
          orderId: order._id,
          reviewed: !!existing,
        });
      }
    }

    return out.sort((a, b) => b.deliveredAt - a.deliveredAt);
  },
});

/** Create a review. Eligibility is re-checked here, never trusted from args. */
export const create = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    text: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Vui lòng đăng nhập để đánh giá.");

    const product = await ctx.db.get(args.productId);
    if (!product) return { created: false as const, reason: "no_product" as const };

    const rating = Math.round(args.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > MAX_RATING) {
      return { created: false as const, reason: "bad_rating" as const };
    }

    // Eligibility: a delivered order of theirs containing this product.
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    const eligible = orders.some(
      (order) =>
        normalizeStatus(order.status) === "delivered" &&
        (order.items ?? []).some(
          (item) => ctx.db.normalizeId("products", item.productId) === args.productId,
        ),
    );
    if (!eligible) {
      return { created: false as const, reason: "not_eligible" as const };
    }

    const duplicate = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (duplicate) return { created: false as const, reason: "duplicate" as const };

    const photos = (args.photos ?? [])
      .filter((p): p is string => typeof p === "string" && !!p)
      .slice(0, MAX_PHOTOS);

    const orderId = orders.find(
      (order) =>
        normalizeStatus(order.status) === "delivered" &&
        (order.items ?? []).some(
          (item) => ctx.db.normalizeId("products", item.productId) === args.productId,
        ),
    )?._id;

    await ctx.db.insert("reviews", {
      productId: args.productId,
      userId,
      ...(orderId ? { orderId } : {}),
      rating,
      ...(cleanText(args.text) ? { text: cleanText(args.text)! } : {}),
      ...(photos.length ? { photos } : {}),
      createdAt: Date.now(),
    });
    return { created: true as const };
  },
});

/** Owner moderation: every review, newest first. */
export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("reviews").order("desc").take(500);
    return await Promise.all(
      rows.map(async (row) => {
        const [product, author, order] = await Promise.all([
          ctx.db.get(row.productId),
          ctx.db.get(row.userId),
          row.orderId ? ctx.db.get(row.orderId) : Promise.resolve(null),
        ]);
        return {
          _id: row._id,
          productId: row.productId,
          // A moderation list is useless without these three: which product, who
          // said it, and the order that made the review legitimate.
          productName: product?.nameVi || product?.nameEn || "— đã xoá —",
          authorName: (author?.name ?? "").trim() || "Khách hàng",
          authorEmail: (author?.email ?? "").trim(),
          orderCode: order?.orderCode ?? null,
          rating: row.rating,
          text: row.text ?? "",
          photoCount: (row.photos ?? []).length,
          createdAt: row.createdAt,
        };
      }),
    );
  },
});

/** Owner moderation: delete a review and its photo blobs. */
export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return { removed: false as const };
    try {
      await ctx.db.delete(args.id);
      for (const photo of row.photos ?? []) {
        await ctx.storage.delete(asStorageId(photo)).catch(() => {});
      }
      return { removed: true as const };
    } catch {
      return { removed: false as const };
    }
  },
});

/** Short-lived upload URL for a customer's review photo. */
export const generatePhotoUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Vui lòng đăng nhập để tải ảnh lên.");
    return await ctx.storage.generateUploadUrl();
  },
});

