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
      { nameVi: "Đầm xòe hoa nhí", nameEn: "Floral Midi Dress", category: "dresses", price: 685000, sizes: clothing, inStock: true },
      { nameVi: "Áo khoác len cardigan", nameEn: "Chunky Knit Cardigan", category: "cardigans", price: 550000, sizes: clothing, inStock: true },
      { nameVi: "Áo sơ mi linen", nameEn: "Linen Blend Shirt", category: "tops", price: 420000, sizes: clothing, inStock: true },
      { nameVi: "Quần ống rộng", nameEn: "Wide-Leg Trousers", category: "trousers", price: 490000, sizes: clothing, inStock: true },
      { nameVi: "Túi đeo chéo da mềm", nameEn: "Soft Leather Crossbody", category: "accessories", price: 380000, sizes: ["Free Size"], inStock: true },
      { nameVi: "Set chân váy & áo cộc", nameEn: "Skirt & Tee Set", category: "bestsellers", price: 720000, sizes: clothing, inStock: true },
      { nameVi: "Đầm suông cổ vuông", nameEn: "Square-Neck Slip Dress", category: "dresses", price: 620000, sizes: clothing, inStock: true },
      { nameVi: "Áo thun cotton cơ bản", nameEn: "Everyday Cotton Tee", category: "tops", price: 190000, sizes: clothing, inStock: true },
      { nameVi: "Mũ cói đan tay", nameEn: "Handwoven Straw Hat", category: "accessories", price: 250000, sizes: ["Free Size"], inStock: false },
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
