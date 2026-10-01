import { v } from "convex/values";
import { placeholderArt } from "../lib/art";
import { normalizeProductRow } from "../lib/catalog";
import { requireOwner } from "../lib/owner";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const categoryValidator = v.union(
  v.literal("tops"),
  v.literal("dresses"),
  v.literal("cardigans"),
  v.literal("trousers"),
  v.literal("bestsellers"),
);

/** All products, newest first, each with a resolved image URL.
 *
 *  Rows are normalised before they leave the query: the storefront calls
 *  `product.sizes.map(...)` in several components, so a legacy row missing
 *  `sizes` (schemaValidation is off) would blank the whole shop. Storage URLs
 *  are resolved defensively too — a blob deleted out from under us must
 *  degrade to the placeholder, not reject the entire product list. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").order("desc").collect();
    return await Promise.all(
      products.map(async (product) => {
        const row = normalizeProductRow(product);
        let image: string | null = null;
        if (row.imageStorageId) {
          try {
            image = await ctx.storage.getUrl(row.imageStorageId);
          } catch {
            // The blob is gone — fall back to the inline artwork, then to null.
            image = row.imageSrc ?? null;
          }
        } else {
          image = row.imageSrc ?? null;
        }
        return {
          _id: row._id,
          _creationTime: row._creationTime,
          nameVi: row.nameVi,
          nameEn: row.nameEn,
          category: row.category,
          price: row.price,
          sizes: row.sizes,
          inStock: row.inStock,
          description: row.description ?? null,
          stock: row.stock ?? null,
          image,
        };
      }),
    );
  },
});

/** Short-lived upload URL for the admin dropzone (camera capture / file drop).
 *
 *  Owner-only: an open upload endpoint lets anyone fill the deployment's
 *  storage (and its bill) with arbitrary blobs. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
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
    description: v.optional(v.string()),
    stock: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    imageSrc: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (!args.nameVi.trim() && !args.nameEn.trim()) {
      throw new Error("A product name is required");
    }
    const description = args.description?.trim().slice(0, 2000);
    const stock = Number.isFinite(args.stock as number)
      ? Math.max(0, Math.round(args.stock as number))
      : undefined;
    // Every non-optional field is written explicitly — an uploaded row that is
    // missing `sizes`/`inStock` is exactly what the storefront used to crash on.
    const sizes = Array.from(
      new Set(args.sizes.map((s) => s.trim()).filter(Boolean)),
    );

    await ctx.db.insert("products", {
      nameVi: args.nameVi.trim(),
      nameEn: args.nameEn.trim() || args.nameVi.trim(),
      category: args.category,
      price: Math.max(0, Math.round(args.price)),
      sizes,
      inStock: args.inStock,
      ...(description ? { description } : {}),
      ...(stock === undefined ? {} : { stock }),
      ...(args.imageStorageId ? { imageStorageId: args.imageStorageId } : {}),
      ...(args.imageSrc ? { imageSrc: args.imageSrc } : {}),
      createdAt: Date.now(),
    });
  },
});

/**
 * Edit any product field, including a replacement photo.
 *
 * Only the fields actually supplied are written, so a caller that omits
 * `description` or `stock` keeps whatever was already stored. A new
 * `imageStorageId` also clears the inline `imageSrc` placeholder — otherwise
 * the storefront would keep rendering the old SVG.
 */
export const update = mutation({
  args: {
    id: v.id("products"),
    nameVi: v.string(),
    nameEn: v.string(),
    category: categoryValidator,
    price: v.number(),
    sizes: v.array(v.string()),
    description: v.optional(v.string()),
    stock: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const { id, description, stock, imageStorageId, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Product not found");

    const patch: Record<string, unknown> = {
      ...fields,
      nameVi: fields.nameVi.trim(),
      nameEn: fields.nameEn.trim() || fields.nameVi.trim(),
      price: Math.max(0, Math.round(fields.price)),
      // Normalise the editable arrays the same way `add` does, and never write
      // an empty `sizes` (the storefront reads `sizes[0]`).
      sizes: Array.from(
        new Set((fields.sizes ?? []).map((s) => s.trim()).filter(Boolean)),
      ),
    };
    if ((patch.sizes as string[]).length === 0) {
      patch.sizes = existing.sizes ?? [];
    }
    if (description !== undefined) {
      patch.description = description.trim().slice(0, 2000) || undefined;
    }
    if (stock !== undefined && Number.isFinite(stock)) {
      patch.stock = Math.max(0, Math.round(stock));
    }
    if (imageStorageId) {
      patch.imageStorageId = imageStorageId;
      patch.imageSrc = undefined;
      // The blob this replaces is no longer referenced by anything.
      if (existing.imageStorageId) {
        await ctx.storage.delete(existing.imageStorageId).catch(() => {});
      }
    }

    await ctx.db.patch(id, patch);
  },
});

export const setStock = mutation({
  args: { id: v.id("products"), inStock: v.boolean() },
  handler: async (ctx, { id, inStock }) => {
    await requireOwner(ctx);
    const existing = await ctx.db.get(id);
    // A row deleted from another tab must not throw into the seller UI.
    if (!existing) return { updated: false };
    await ctx.db.patch(id, { inStock });
    return { updated: true };
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireOwner(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) return;
    await ctx.db.delete(id);
    if (existing.imageStorageId) {
      // Best effort — a dangling blob must never block a delete.
      await ctx.storage.delete(existing.imageStorageId).catch(() => {});
    }
  },
});

/** First-run catalogue — runs at most once, ever.
 *
 *  The `seeded` marker row is written BEFORE any product insert, so two
 *  concurrent callers (or a retry after a partial failure) can never insert the
 *  catalogue twice. Once the marker exists this mutation is a no-op, which is
 *  what keeps the admin catalogue stable: if the owner deletes every product the
 *  store stays empty instead of silently repopulating. */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const marker = await ctx.db
      .query("seeded")
      .filter((q) => q.eq(q.field("id"), "seed"))
      .unique();
    if (marker) return { seeded: false };

    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0) {
      // Products already present (never seeded by us) — just latch the marker.
      await ctx.db.insert("seeded", { id: "seed", at: Date.now() });
      return { seeded: false };
    }

    // Latch first: this makes the whole operation idempotent.
    await ctx.db.insert("seeded", { id: "seed", at: Date.now() });

    const clothing = ["S", "M", "L", "XL"];
    const seeds: Array<{
      nameVi: string;
      nameEn: string;
      category:
        | "tops"
        | "dresses"
        | "cardigans"
        | "trousers"
        | "bestsellers";
      price: number;
      sizes: string[];
      inStock: boolean;
    }> = [
      { nameVi: "Áo bra nâng dáng mềm mại", nameEn: "Soft Push-Up Bra", category: "tops", price: 285000, sizes: clothing, inStock: true },
      { nameVi: "Quần lót cotton thoáng khí", nameEn: "Breathable Cotton Panty", category: "dresses", price: 95000, sizes: clothing, inStock: true },
      { nameVi: "Set bộ đồ lót ren cao cấp", nameEn: "Premium Lace Lingerie Set", category: "cardigans", price: 455000, sizes: clothing, inStock: true },
      { nameVi: "Váy ngủ lụa thép", nameEn: "Silk Slip Nightgown", category: "trousers", price: 390000, sizes: clothing, inStock: true },
      { nameVi: "Serum dưỡng trắng da", nameEn: "Brightening Face Serum", category: "trousers", price: 260000, sizes: ["Free Size"], inStock: true },
      { nameVi: "Kem chống nắng định hình", nameEn: "Tone-Up Sunscreen", category: "bestsellers", price: 185000, sizes: ["Free Size"], inStock: true },
      { nameVi: "Bra lót vô hình không đường may", nameEn: "Seamless Invisible Bra", category: "tops", price: 225000, sizes: clothing, inStock: true },
      { nameVi: "Set đồ ngủ cotton hai món", nameEn: "Two-Piece Cotton Pajama Set", category: "trousers", price: 340000, sizes: clothing, inStock: true },
      { nameVi: "Nước tẩy trang dịu nhẹ", nameEn: "Gentle Micellar Water", category: "trousers", price: 145000, sizes: ["Free Size"], inStock: false },
    ];

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]!;
      await ctx.db.insert("products", {
        ...seed,
        imageSrc: placeholderArt(seed.nameEn, i),
        createdAt: Date.now() - i * 1000,
      });
    }
    return { seeded: true };
  },
});

export type StorageId = Id<"_storage">;
