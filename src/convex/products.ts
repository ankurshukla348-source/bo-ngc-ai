import { v } from "convex/values";
import { placeholderArt } from "../lib/art";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const categoryValidator = v.union(
  v.literal("tops"),
  v.literal("dresses"),
  v.literal("cardigans"),
  v.literal("trousers"),
  v.literal("accessories"),
  v.literal("bestsellers"),
);

/** All products, newest first, each with a resolved image URL. */
/** One-time migration: remove legacy geometric-SVG placeholder rows (the old
 *  fashion seed data) so the new lingerie/beauty seed mix repopulates.
 *  Products with a real uploaded photo (imageStorageId) are never touched. */
export const migrateLegacyImages = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let removed = 0;
    for (const product of products) {
      if (product.imageStorageId) continue;
      const src = product.imageSrc ?? "";
      if (src.startsWith("data:image/svg+xml")) {
        await ctx.db.delete(product._id);
        removed++;
      }
    }
    return { removed };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("desc").collect();
    return await Promise.all(
      products.map(async (product) => ({
        _id: product._id,
        _creationTime: product._creationTime,
        nameVi: product.nameVi,
        nameEn: product.nameEn,
        category: product.category,
        price: product.price,
        sizes: product.sizes,
        inStock: product.inStock,
        image: product.imageStorageId
          ? await ctx.storage.getUrl(product.imageStorageId)
          : (product.imageSrc ?? null),
      })),
    );
  },
});

/** Short-lived upload URL for the admin dropzone (camera capture / file drop). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    nameVi: v.string(),
    nameEn: v.string(),
    category: categoryValidator,
    price: v.number(),
    sizes: v.array(v.string()),
    inStock: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
    imageSrc: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.nameVi.trim() && !args.nameEn.trim()) {
      throw new Error("A product name is required");
    }
    await ctx.db.insert("products", {
      ...args,
      nameVi: args.nameVi.trim(),
      nameEn: args.nameEn.trim() || args.nameVi.trim(),
      price: Math.max(0, Math.round(args.price)),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    nameVi: v.string(),
    nameEn: v.string(),
    category: categoryValidator,
    price: v.number(),
    sizes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Product not found");
    await ctx.db.patch(id, {
      ...fields,
      nameVi: fields.nameVi.trim(),
      nameEn: fields.nameEn.trim() || fields.nameVi.trim(),
      price: Math.max(0, Math.round(fields.price)),
    });
  },
});

export const setStock = mutation({
  args: { id: v.id("products"), inStock: v.boolean() },
  handler: async (ctx, { id, inStock }) => {
    await ctx.db.patch(id, { inStock });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;
    await ctx.db.delete(id);
    if (existing.imageStorageId) {
      // Best effort — a dangling blob must never block a delete.
      await ctx.storage.delete(existing.imageStorageId).catch(() => {});
    }
  },
});

/** First-run catalogue. Safe to call repeatedly — only seeds an empty store. */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0) return;

    const clothing = ["S", "M", "L", "XL"];
    const seeds: Array<{
      nameVi: string;
      nameEn: string;
      category:
        | "tops"
        | "dresses"
        | "cardigans"
        | "trousers"
        | "accessories"
        | "bestsellers";
      price: number;
      sizes: string[];
      inStock: boolean;
    }> = [
      { nameVi: "Áo bra nâng dáng mềm mại", nameEn: "Soft Push-Up Bra", category: "tops", price: 285000, sizes: clothing, inStock: true },
      { nameVi: "Quần lót cotton thoáng khí", nameEn: "Breathable Cotton Panty", category: "dresses", price: 95000, sizes: clothing, inStock: true },
      { nameVi: "Set bộ đồ lót ren cao cấp", nameEn: "Premium Lace Lingerie Set", category: "cardigans", price: 455000, sizes: clothing, inStock: true },
      { nameVi: "Váy ngủ lụa thép", nameEn: "Silk Slip Nightgown", category: "trousers", price: 390000, sizes: clothing, inStock: true },
      { nameVi: "Serum dưỡng trắng da", nameEn: "Brightening Face Serum", category: "accessories", price: 260000, sizes: ["Free Size"], inStock: true },
      { nameVi: "Kem chống nắng định hình", nameEn: "Tone-Up Sunscreen", category: "bestsellers", price: 185000, sizes: ["Free Size"], inStock: true },
      { nameVi: "Bra lót vô hình không đường may", nameEn: "Seamless Invisible Bra", category: "tops", price: 225000, sizes: clothing, inStock: true },
      { nameVi: "Set đồ ngủ cotton hai món", nameEn: "Two-Piece Cotton Pajama Set", category: "trousers", price: 340000, sizes: clothing, inStock: true },
      { nameVi: "Nước tẩy trang dịu nhẹ", nameEn: "Gentle Micellar Water", category: "accessories", price: 145000, sizes: ["Free Size"], inStock: false },
    ];

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]!;
      await ctx.db.insert("products", {
        ...seed,
        imageSrc: placeholderArt(seed.nameEn, i),
        createdAt: Date.now() - i * 1000,
      });
    }
  },
});

export type StorageId = Id<"_storage">;
