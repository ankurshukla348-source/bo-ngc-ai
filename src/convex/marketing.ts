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
 */
import { Resend } from "resend";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action } from "./_generated/server";

const audienceQuery = makeFunctionReference<"query">("users:marketingAudience");

const MAX_RECIPIENTS = 300;
const BATCH_SIZE = 100;

const DEFAULT_FROM = "Shop Bảo Ngọc <onboarding@resend.dev>";

/** Escape user-authored copy before it is wrapped in the email HTML. */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  },
  handler: async (ctx, args) => {
    const subject = args.subject.trim().slice(0, 200);
    const body = args.body.trim().slice(0, 8000);
    if (!subject || !body) {
      return { ok: false, reason: "empty_campaign" as const, sent: 0, failed: 0, total: 0 };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, reason: "missing_key" as const, sent: 0, failed: 0, total: 0 };
    }

    const audience = await ctx.runQuery(audienceQuery, {});
    const recipients: { email: string; name: string | null }[] = audience.slice(
      0,
      MAX_RECIPIENTS,
    );
    if (recipients.length === 0) {
      return { ok: false, reason: "no_recipients" as const, sent: 0, failed: 0, total: 0 };
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

      const { data, error } = await resend.batch.send(batch);
      if (error) {
        failed += batch.length;
        if (errors.length < 3) errors.push(error.message);
        continue;
      }
      if (data) {
        sent += data.length;
      } else {
        failed += batch.length;
      }
    }

    return {
      ok: failed === 0,
      reason: (failed === 0 ? "ok" : "partial") as "ok" | "partial",
      sent,
      failed,
      total: recipients.length,
      skipped: Math.max(0, audience.length - MAX_RECIPIENTS),
      errors,
    };
  },
});
