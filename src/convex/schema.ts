import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Storefront catalog ─────────────────────────────────────
    products: defineTable({
      nameVi: v.string(),
      nameEn: v.string(),
      category: v.union(
        v.literal("tops"),
        v.literal("dresses"),
        v.literal("cardigans"),
        v.literal("trousers"),
        v.literal("accessories"),
        v.literal("bestsellers"),
      ),
      price: v.number(), // VND
      sizes: v.array(v.string()),
      inStock: v.boolean(),
      imageStorageId: v.optional(v.id("_storage")),
      imageSrc: v.optional(v.string()), // data-URI placeholder fallback
      createdAt: v.number(),
    }).index("by_category", ["category"]),

    // ── Checkout orders ────────────────────────────────────────
    orders: defineTable({
      orderCode: v.string(), // unique human-facing order ID, e.g. BN-260923-4821
      status: v.string(), // "new" | "confirmed" | "shipped" | "delivered"
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
      subtotal: v.number(),
      shippingFee: v.number(),
      total: v.number(),
      createdAt: v.number(),
    }).index("by_code", ["orderCode"]),

    // ── Seller settings (VietQR bank account) ──────────────────
    settings: defineTable({
      key: v.string(), // "payment"
      bankBin: v.string(),
      bankName: v.string(),
      accountNo: v.string(),
      accountHolder: v.string(),
    }).index("by_key", ["key"]),

    // ── One-time seed marker ───────────────────────────────────
    // A single row here means starter products were either inserted or the
    // catalogue already had data when this shipped. Seeding NEVER runs while
    // this row exists — admin deletions are final.
    seeded: defineTable({
      id: v.string(), // always "seed"
      at: v.number(),
    }),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
