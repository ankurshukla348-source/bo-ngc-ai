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

    // the users table is the default users table that is brought in by the authTables.
    // It MUST keep every field `authTables` defines (notably `phone` and
    // `phoneVerificationTime`): Convex Auth writes the whole profile on upsert,
    // and dropping a field makes the insert fail with "Insert before error"
    // the first time a Google account signs in.
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove
      phone: v.optional(v.string()), // phone of the user. do not remove
      phoneVerificationTime: v.optional(v.number()), // do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // ── Marketing opt-in (our own field, safe to add) ────────
      // Optional so rows written by Convex Auth (which does not know about
      // this field) still validate. Absent === opted in: the consent is
      // pre-checked at every signup/checkout and only ever stored as an
      // explicit `false` when the customer unchecks it.
      marketingOptIn: v.optional(v.boolean()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Storefront catalog ─────────────────────────────────────
    // Alignment contract with `products.add` / `products.update`:
    //   * every non-optional field below (nameVi, nameEn, category, price,
    //     sizes, inStock) is written explicitly by both mutations, and
    //     `sizes` is de-duplicated and trimmed before it is stored;
    //   * the seller dashboard edits only a subset, and `update` patches just
    //     those fields, so a row keeps `inStock` and its existing sizes;
    //   * `products.list` runs every row through `normalizeProductRow`
    //     (src/lib/catalog.ts) before returning it, because schema validation
    //     is disabled below and rows written by older builds are not
    //     guaranteed to match this declaration. The storefront calls
    //     `product.sizes.map(...)`, so that normalisation is what keeps one
    //     legacy row from blanking the whole shop.
    products: defineTable({
      nameVi: v.string(),
      nameEn: v.string(),
      category: v.union(
        v.literal("tops"),
        v.literal("dresses"),
        v.literal("cardigans"),
        v.literal("trousers"),
        v.literal("bestsellers"),
      ),
      price: v.number(), // VND
      sizes: v.array(v.string()),
      inStock: v.boolean(),
      description: v.optional(v.string()), // free-text detail for the seller page
      stock: v.optional(v.number()), // units on hand; absent = not tracked
      imageStorageId: v.optional(v.id("_storage")),
      imageSrc: v.optional(v.string()), // data-URI placeholder fallback
      createdAt: v.number(),
    }).index("by_category", ["category"]),

    // ── Checkout orders ────────────────────────────────────────
    orders: defineTable({
      orderCode: v.string(), // unique human-facing order ID, e.g. BN-260923-4821
      status: v.string(), // see ORDER_STATUSES in src/lib/orders.ts
      // Set when the order was placed by a signed-in customer, so /account can
      // list their own orders. Guest checkout has no account, so these stay
      // undefined and the order is only visible in the seller dashboard.
      userId: v.optional(v.id("users")),
      customerEmail: v.optional(v.string()),
      // Email a guest typed at checkout (order confirmations go here). Kept
      // separate from `customerEmail`, which belongs to a signed-in account.
      guestEmail: v.optional(v.string()),
      // Site language at checkout, so the order email matches the language
      // the customer used while ordering.
      lang: v.optional(v.string()),
      // Set once the seller erases the delivery details of a finished order,
      // so the dashboard can show "đã xóa" instead of the redacted fields.
      addressRedactedAt: v.optional(v.number()),
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
      // ── Order email outcome ────────────────────────────────
      // The receipt/status email is best-effort: it must never cost a
      // customer their order. But "best-effort" used to mean *silent* — the
      // shop had no way to learn that Resend was rejecting every send because
      // no sending domain was verified. The mail job writes the outcome here
      // so the seller dashboard can show exactly which orders never got an
      // email, and can still reach the customer another way.
      //   emailStatus: "sent" | "failed"
      //   emailReason: e.g. "domain_not_verified" | "no_email" | "send_failed"
      emailStatus: v.optional(v.string()),
      emailSentAt: v.optional(v.number()),
      emailReason: v.optional(v.string()),
    }).index("by_code", ["orderCode"]),

    // ── Seller settings (VietQR bank account) ──────────────────
    settings: defineTable({
      key: v.string(), // "payment"
      bankBin: v.string(),
      bankName: v.string(),
      accountNo: v.string(),
      accountHolder: v.string(),
    }).index("by_key", ["key"]),

    // ── Storefront live chat ───────────────────────────────────
    // One row per chat message. `conversationId` is an opaque, per-browser
    // key from the storefront widget (or the signed-in user id) so the seller
    // inbox can group threads without any customer account.
    messages: defineTable({
      conversationId: v.string(),
      author: v.union(v.literal("customer"), v.literal("seller")),
      body: v.string(),
      // Denormalised so the seller can identify a visitor even if they
      // never sign in.
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      userId: v.optional(v.id("users")),
      readAt: v.optional(v.number()), // set when the seller opens the thread
      createdAt: v.number(),
    }).index("by_conversation", ["conversationId"]),

    // ── Spam throttle ──────────────────────────────────────────
    // One row per recent request from a phone number or chat thread. Rows are
    // pruned on write, so the table stays small and needs no sweeper.
    throttle: defineTable({
      key: v.string(), // e.g. "order:0901234567" or "chat:c:abc123"
      at: v.number(),
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
    // Deliberately OFF. Turning it on would reject any write against a row
    // created before a field was added, and rows in this deployment were
    // written by several generations of the app (including before the
    // `orders.items`/`addressRedactedAt` fields existed). Reads are hardened at
    // the query boundary instead — `normalizeOrder` and `normalizeProductRow`
    // guarantee the shape the UI renders, and every seller-only function calls
    // `requireOwner` — so the guarantee does not depend on write-time
    // validation.
    schemaValidation: false,
  },
);

export default schema;
