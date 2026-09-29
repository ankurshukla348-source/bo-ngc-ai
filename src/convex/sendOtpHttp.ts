import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** POST /api/send-otp — literal HTTP endpoint for triggering the 6-digit
 *  OTP email through Resend.
 *
 *  HTTP actions run in the V8 runtime (no node:crypto / no direct env-based
 *  SDK init guarantees), so this handler stays thin: validate the payload,
 *  then delegate to the Node-runtime action in authService.ts which hashes
 *  the code, stores the record, and sends the email via Resend.
 *
 *  Body:  { "email": "customer@example.com", "purpose": "register"|"reset" }
 *  200 →  { "sent": true }          400/405/500 →  { "error": "…" }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendOtpEndpoint = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }


  let email = "";
  let purpose: "register" | "reset" = "register";
  try {
    const body = (await request.json()) as {
      email?: string;
      purpose?: string;
    };
    email = (body.email ?? "").trim().toLowerCase();
    purpose = body.purpose === "reset" ? "reset" : "register";
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "Invalid email" });
  }

  try {
    await ctx.runAction(internal.authService.requestOtpAction, {
      email,
      purpose,
    });
    return json(200, { sent: true });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Failed to send OTP",
    });
  }
});


