"use node";

/**
 * Order email notifications (Resend).
 *
 * Runs on the Node runtime because `resend` is a Node SDK and the API key
 * lives in the deployment's environment. The HTML itself is built by
 * src/lib/email.ts, which is pure and unit-tested.
 *
 * Called by a scheduler from orders:create and orders:setStatus, never by the
 * browser: `token` is a server-only constant (see src/convex/orders.ts), so
 * the public endpoint cannot be used to email customers on demand.
 *
 * Nothing here is destructive. A missing key, a missing address or a provider
 * error returns a readable result instead of throwing, because the order is
 * already stored and must not appear to have failed.
 */
import { Resend } from "resend";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action } from "./_generated/server";
import {
  orderReceiptEmail,
  orderStatusEmail,
  type EmailLang,
  type EmailOrder,
} from "../lib/email";
import { normalizeStatus } from "../lib/orders";

/** Must match ORDER_MAIL_TOKEN in src/convex/orders.ts. */
const ORDER_MAIL_TOKEN = "b7n-order-mail-2f9c41";

/** An action has no `db`, so the order is read through this guarded query. */
const mailPayloadRef = makeFunctionReference<"query">("orders:mailPayload");
const recordMailRef = makeFunctionReference<"mutation">(
  "orders:recordMailResult",
);

const DEFAULT_FROM = "Shop Bảo Ngọc <onboarding@resend.dev>";

/**
 * Is this failure caused by having no verified sending domain?
 *
 * `onboarding@resend.dev` is Resend's test sender: it delivers ONLY to the
 * account owner's own address, so any real customer address is refused. We do
 * not rely on the provider's wording for this — Resend's exact message has
 * changed between releases ("you can only send testing emails…", "invalid
 * `to` field…", "domain not verified") and string-matching a moving target
 * would let the shop fall back to a meaningless "send failed" banner.
 *
 * The misconfiguration is knowable without asking Resend at all: if
 * `RESEND_FROM` was never set we ARE on the test sender, so every non-owner
 * recipient is guaranteed to fail. The message patterns stay as a second
 * signal for the case where a domain IS configured but unverified.
 */
function isDomainProblem(message: string, usingTestSender: boolean): boolean {
  if (usingTestSender) return true;
  return /only send testing emails|onboarding@resend\.dev|testing email address|domain (is )?not verified|not been verified|unverified domain/i.test(
    message,
  );
}

/** Write the outcome back onto the order — best effort, never throws. */
async function record(
  ctx: { runMutation: (ref: typeof recordMailRef, args: Record<string, unknown>) => Promise<unknown> },
  orderId: string,
  ok: boolean,
  reason?: string,
): Promise<void> {
  try {
    await ctx.runMutation(recordMailRef, {
      token: ORDER_MAIL_TOKEN,
      id: orderId,
      ok,
      ...(reason ? { reason } : {}),
    });
  } catch {
    /* the order itself is already stored — never fail the mail job over this */
  }
}

export const sendOrderEmail = action({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    kind: v.union(v.literal("placed"), v.literal("status")),
  },
  handler: async (ctx, args) => {
    if (args.token !== ORDER_MAIL_TOKEN) throw new Error("Not authorized");

    const order = await ctx.runQuery(mailPayloadRef, {
      token: args.token,
      id: args.orderId,
    });
    if (!order) return { ok: false as const, reason: "not_found" as const };

    // Guests type an address at checkout; signed-in customers already have one.
    const to = order.recipient;
    if (!to) {
      await record(ctx, args.orderId, false, "no_email");
      return { ok: false as const, reason: "no_email" as const };
    }

    const status = normalizeStatus(order.status);
    const lang: EmailLang = order.lang === "en" ? "en" : "vi";
    const emailOrder: EmailOrder = {
      orderCode: order.orderCode,
      createdAt: order.createdAt,
      status: order.status,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
    };

    const { subject, html } =
      args.kind === "placed"
        ? orderReceiptEmail(emailOrder, lang)
        : orderStatusEmail(emailOrder, status, lang);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await record(ctx, args.orderId, false, "missing_key");
      return { ok: false as const, reason: "missing_key" as const };
    }

    const from = (process.env.RESEND_FROM || DEFAULT_FROM).trim();
    const usingTestSender = !process.env.RESEND_FROM;
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (error) {
      const message = error.message ?? "";
      const reason = isDomainProblem(message, usingTestSender)
        ? "domain_not_verified"
        : "send_failed";
      await record(ctx, args.orderId, false, reason);
      console.error(
        `[mail] ${reason} (from=${from}, to=${to}):`,
        message,
      );
      return { ok: false as const, reason };
    }
    await record(ctx, args.orderId, true);
    return { ok: true as const, to, kind: args.kind, status };
  },
});
