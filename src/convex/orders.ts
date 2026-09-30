import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  isHoneypotTripped,
  MAX_ORDER_ITEMS,
  normalizePhone,
  ORDER_LIMIT,
  orderThrottleKey,
} from "../lib/antiSpam";
import { shippingFeeFor } from "../lib/catalog";
import {
  isOrderStatus,
  isRedactableStatus,
  normalizeStatus,
  ORDER_STATUSES,
  redactCustomer,
} from "../lib/orders";
import { requireOwner } from "../lib/owner";
import { allowRequest } from "./throttle";
import { mutation, query } from "./_generated/server";
import { makeFunctionReference } from "convex/server";

/**
 * Order emails are sent by a scheduled action. The action lives on the Node
 * runtime (Resend is a Node SDK), so the reference is built by name instead of
 * importing the module — same reason src/convex/marketing.ts does it this way.
 *
 * The token is a server-only constant: it never reaches the browser bundle, and
 * it stops anyone from calling the mail action directly through the public
 * endpoint to spam a customer's inbox.
 */
const ORDER_MAIL_TOKEN = "b7n-order-mail-2f9c41";
const orderMailRef = makeFunctionReference<"action">("notifications:sendOrderEmail");
const mailPayloadRef = makeFunctionReference<"query">("orders:mailPayload");

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
    /** Honeypot — must stay empty. Bots fill every field they can find. */
    website: v.optional(v.string()),
    /** Optional email for the order confirmation (guest checkout). */
    email: v.optional(v.string()),
    /** Site language, so the order email matches what the customer read. */
    lang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) throw new Error("Cart is empty");
    if (args.items.length > MAX_ORDER_ITEMS) {
      throw new Error("Too many items in one order");
    }
    // A filled honeypot means an automated form submission.
    if (isHoneypotTripped(args.website)) throw new Error("Order rejected");

    const customer = {
      name: args.customer.name.trim().slice(0, 120),
      phone: args.customer.phone.trim().slice(0, 30),
      province: args.customer.province.trim().slice(0, 120),
      district: args.customer.district.trim().slice(0, 120),
      ward: args.customer.ward.trim().slice(0, 120),
      street: args.customer.street.trim().slice(0, 300),
      ...(args.customer.note?.trim()
        ? { note: args.customer.note.trim().slice(0, 500) }
        : {}),
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

    // Zone-based fee, resolved server-side from the delivery address so the
    // amount charged can never be lower than the published rate.
    const shippingFee = shippingFeeFor(subtotal, customer);
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

    // One phone number may only place a handful of orders an hour, so a bored
    // script cannot bury the real ones under fake ones.
    const allowed = await allowRequest(
      ctx,
      orderThrottleKey(customer.phone),
      ORDER_LIMIT,
    );
    if (!allowed) throw new Error("Too many orders from this phone number");

    const email = args.email?.trim().toLowerCase().slice(0, 200);
    const guestEmail =
      email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : undefined;

    const orderId = await ctx.db.insert("orders", {
      orderCode,
      status: "processing",
      items,
      customer,
      paymentMethod: args.paymentMethod,
      subtotal,
      shippingFee,
      total,
      createdAt,
      ...(guestEmail ? { guestEmail } : {}),
      ...(args.lang === "en" ? { lang: "en" } : {}),
    });

    // Fire-and-forget receipt. The order is already stored, so a mail failure
    // can never cost the customer their order.
    try {
      await ctx.scheduler.runAfter(0, orderMailRef, {
        token: ORDER_MAIL_TOKEN,
        orderId,
        kind: "placed" as const,
      });
    } catch {
      /* mail is best-effort — the confirmation screen already shows the order */
    }

    return { orderCode, subtotal, shippingFee, total, createdAt };
  },
});

/**
 * Link the order to the signed-in customer so /account can list it.
 *
 * Read *after* the order is inserted, on a best-effort basis: a guest order
 * stays unlinked, and a failed lookup can never cost the customer their order.
 */
export const linkToAccount = mutation({
  args: { orderCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { linked: false };
    const user = await ctx.db.get(userId);
    if (!user?.email) return { linked: false };

    const order = await ctx.db
      .query("orders")
      .withIndex("by_code", (q) => q.eq("orderCode", args.orderCode))
      .unique();
    if (!order) return { linked: false };

    try {
      await ctx.db.patch(order._id, {
        userId,
        customerEmail: user.email,
      });
      return { linked: true };
    } catch {
      return { linked: false };
    }
  },
});

/** Every order, newest first — the seller dashboard. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("orders")
      .order("desc")
      .take(Math.min(args.limit ?? 100, 300));
  },
});

/**
 * Minimal order snapshot for the mail action.
 *
 * An action has no `db`, so the mail job reads the order through this query.
 * It is reachable only with the server-only mail token, so it is never an
 * order-detail endpoint for the public API.
 */
export const mailPayload = query({
  args: { token: v.string(), id: v.id("orders") },
  handler: async (ctx, args) => {
    if (args.token !== ORDER_MAIL_TOKEN) throw new Error("Not authorized");
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    return {
      orderCode: order.orderCode,
      status: order.status,
      createdAt: order.createdAt,
      lang: order.lang ?? "vi",
      recipient: order.customerEmail ?? order.guestEmail ?? null,
      customer: {
        name: order.customer.name,
        ward: order.customer.ward,
        district: order.customer.district,
        province: order.customer.province,
      },
      items: order.items.map((item) => ({
        nameVi: item.nameVi,
        nameEn: item.nameEn,
        size: item.size,
        qty: item.qty,
        price: item.price,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
    };
  },
});

/**
 * Guest order lookup: order code + the phone number used at checkout.
 *
 * Most COD customers never sign in, so /account cannot be the only way to see
 * an order. The phone number is the second factor — a guesser needs both — and
 * the answer is deliberately narrower than `orders:list`: no street address, no
 * phone, and the street is masked even for a correct match. A wrong code or
 * phone returns the same `null` either way, so the endpoint cannot be used to
 * confirm which order codes exist.
 */
export const track = query({
  args: { orderCode: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const code = args.orderCode.trim().toUpperCase();
    const phone = normalizePhone(args.phone);
    if (!code || phone.length < 8) return null;

    const order = await ctx.db
      .query("orders")
      .withIndex("by_code", (q) => q.eq("orderCode", code))
      .unique();
    if (!order) return null;
    if (normalizePhone(order.customer.phone) !== phone) return null;

    const street = order.customer.street;
    return {
      orderCode: order.orderCode,
      status: order.status,
      createdAt: order.createdAt,
      customerName: order.customer.name,
      // Enough to recognise the address, not enough to deliver to it.
      deliveryArea: [order.customer.ward, order.customer.district, order.customer.province]
        .filter(Boolean)
        .join(", "),
      streetPreview: maskStreet(street),
      addressRedacted: order.addressRedactedAt !== undefined,
      note: order.customer.note ?? null,
      items: order.items.map((item) => ({
        nameVi: item.nameVi,
        nameEn: item.nameEn,
        size: item.size,
        qty: item.qty,
        price: item.price,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
    };
  },
});

/** "12 Trần Phú" → "12 T*** Phú" — recognisable, not reusable. */
function maskStreet(street: string): string {
  const trimmed = street.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words
    .map((word, index) =>
      index === 0 || word.length <= 2
        ? word
        : `${word.slice(0, 2)}${"*".repeat(Math.min(3, word.length - 2))}`,
    )
    .join(" ");
}

/** The signed-in customer's own orders, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(50);
  },
});

/**
 * Move an order along the fulfilment flow.
 *
 * The status is validated against the shared ORDER_STATUSES list rather than
 * trusted, so a typo (or a hand-crafted request) can never write a status the
 * customer UI has no badge for.
 */
export const setStatus = mutation({
  args: { id: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const status = args.status.trim().toLowerCase();
    if (!isOrderStatus(status)) {
      throw new Error(
        `Unknown status. Expected one of: ${ORDER_STATUSES.join(", ")}`,
      );
    }
    const order = await ctx.db.get(args.id);
    if (!order) return { updated: false };
    try {
      await ctx.db.patch(args.id, { status });

      // Tell the customer their parcel moved on.
      if (status !== normalizeStatus(order.status)) {
        try {
          await ctx.scheduler.runAfter(0, orderMailRef, {
            token: ORDER_MAIL_TOKEN,
            orderId: args.id,
            kind: "status" as const,
          });
        } catch {
          /* best-effort: the status itself is already saved */
        }
      }
      return { updated: true };
    } catch {
      return { updated: false };
    }
  },
});

/**
 * Permanently erase the customer's delivery details from a finished order.
 *
 * Only the store owner may run it, and only once the order is delivered or
 * cancelled — the point at which the address has no operational use left.
 * Everything the shop needs for accounting (order id, items, totals, the
 * completion date) is deliberately left untouched.
 */
export const redactAddress = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) return { redacted: false as const, reason: "not_found" as const };

    if (!isRedactableStatus(order.status)) {
      return { redacted: false as const, reason: "still_active" as const };
    }
    if (order.addressRedactedAt !== undefined) {
      return { redacted: true as const, reason: "already" as const };
    }

    try {
      await ctx.db.patch(args.id, {
        customer: redactCustomer(order.customer),
        addressRedactedAt: Date.now(),
      });
      return { redacted: true as const, reason: "redacted" as const };
    } catch {
      return { redacted: false as const, reason: "failed" as const };
    }
  },
});

/**
 * Every order as CSV, for the shop's own bookkeeping.
 *
 * Owner-only. UTF-8 BOM first so Excel opens Vietnamese diacritics correctly,
 * and the newest orders come last so a fresh export appends cleanly to the
 * previous one. Redacted addresses export as the placeholder, never as the
 * original.
 */
export const exportCsv = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const orders = await ctx.db.query("orders").order("asc").collect();

    const escapeCell = (value: string | number) => {
      const text = String(value);
      return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const header = [
      "Order code",
      "Created at",
      "Status",
      "Customer",
      "Phone",
      "Street",
      "Ward",
      "District",
      "Province",
      "Note",
      "Items",
      "Subtotal",
      "Shipping",
      "Total",
    ];

    const rows = orders.map((order) => [
      order.orderCode,
      new Date(order.createdAt).toISOString(),
      normalizeStatus(order.status),
      order.customer.name,
      order.customer.phone,
      order.customer.street,
      order.customer.ward,
      order.customer.district,
      order.customer.province,
      order.customer.note ?? "",
      order.items
        .map((item) => `${item.nameVi} (${item.size}) x${item.qty}`)
        .join("; "),
      order.subtotal,
      order.shippingFee,
      order.total,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

    return { filename: `bao-ngoc-orders-${Date.now()}.csv`, csv: `\uFEFF${csv}` };
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
