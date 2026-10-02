"use node";

/**
 * Promotional email broadcast (Resend).
 *
 * Runs on the Node runtime because `resend` is a Node SDK and the API key
 * lives in the deployment's environment. The recipient list is resolved from
 * the `users` table by `users.marketingAudience`, which already applies the
 * `marketingOptIn` consent rule.
 *
 * Nothing here is destructive: a missing API key returns a readable result
 * (the seller UI shows a banner) instead of throwing and leaving the tab in
 * a permanent error state.
 *
 * Owner-only: this spends the store's Resend quota and emails real customers,
 * so the guard is enforced here and not just hidden behind the /seller UI.
 */
import { Resend } from "resend";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { escapeHtml } from "../lib/email";
import { requireOwner } from "../lib/owner";
import { action } from "./_generated/server";

const audienceQuery = makeFunctionReference<"query">("users:marketingAudience");

const MAX_RECIPIENTS = 300;
const BATCH_SIZE = 100;

const DEFAULT_FROM = "Shop Bảo Ngọc <onboarding@resend.dev>";

/** Escape user-authored copy before it is wrapped in the email HTML. */
function toHtml(body: string): string {
  const text = escapeHtml(body.trim()).replace(/\n/g, "<br />");
  return [
    '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#2c1622">',
    `<div style="white-space:pre-line;line-height:1.7;font-size:15px">${text}</div>`,
    '<hr style="border:none;border-top:1px solid #eadfe4;margin:24px 0" />',
    '<p style="font-size:12px;color:#8a7a80;margin:0">',
    "Shop Thời Trang &amp; Phụ Kiện Nữ Bảo Ngọc. — Diên Khánh",
    "</p>",
    "</div>",
  ].join("");
}

export const sendBroadcast = action({
  args: {
    subject: v.string(),
    body: v.string(),
    from: v.optional(v.string()),
    /**
     * When set, the campaign goes to this single address instead of the
     * audience — the "send a test first" path, so a draft can be proof-read
     * without emailing every opted-in customer.
     */
    testRecipient: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const subject = args.subject.trim().slice(0, 200);
    const body = args.body.trim().slice(0, 8000);
    if (!subject || !body) {
      return { ok: false, reason: "empty_campaign" as const, sent: 0, failed: 0, total: 0, mode: "broadcast" as const };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "missing_key" as const, sent: 0, failed: 0, total: 0, mode: "broadcast" as const };
    }

    const testRecipient = args.testRecipient?.trim().toLowerCase() || undefined;
    if (testRecipient && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testRecipient)) {
      return { ok: false, reason: "bad_test_address" as const, sent: 0, failed: 0, total: 0, mode: "test" as const };
    }

    const audience = testRecipient ? [] : await ctx.runQuery(audienceQuery, {});
    const recipients: { email: string; name: string | null }[] = testRecipient
      ? [{ email: testRecipient, name: null }]
      : audience.slice(0, MAX_RECIPIENTS);
    if (recipients.length === 0) {
      return { ok: false, reason: "no_recipients" as const, sent: 0, failed: 0, total: 0, mode: "broadcast" as const };
    }

    const from = (args.from || process.env.RESEND_FROM || DEFAULT_FROM).trim();
    const resend = new Resend(apiKey);
    const html = toHtml(body);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map((person) => ({
        from,
        to: person.email,
        subject,
        html,
      }));

      // `permissive` keeps one undeliverable address from failing the whole
      // batch — the rest of the list still goes out, and the bad index is
      // reported back for the seller.
      const { data, error } = await resend.batch.send(batch, {
        batchValidation: "permissive",
      });
      if (error || !data) {
        failed += batch.length;
        if (error && errors.length < 3) errors.push(error.message);
        continue;
      }

      // The success payload nests the created ids: { data: { data: [{ id }] } }.
      sent += data.data.length;
      for (const item of data.errors ?? []) {
        failed += 1;
        if (errors.length < 3) {
          errors.push(
            `${batch[item.index]?.to ?? "?"}: ${item.message}`,
          );
        }
      }
    }

    return {
      ok: failed === 0,
      reason: (failed === 0 ? "ok" : "partial") as "ok" | "partial",
      sent,
      failed,
      total: recipients.length,
      skipped: Math.max(0, audience.length - MAX_RECIPIENTS),
      mode: (testRecipient ? "test" : "broadcast") as "test" | "broadcast",
      errors,
    };
  },
});
