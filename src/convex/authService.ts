"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/* ═══════════════════════════════════════════════════════════════
   Node runtime ("use node"): Resend SDK + node:crypto live here.
   DB writes are delegated to the default runtime via ctx.runMutation
   (see otpStore.ts / customers.ts).
   ═════════════════════════════════════════════════════════════ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Password hashing (scrypt, per-customer salt) ─────────────── */

function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
}

function verifyPassword(
  password: string,
  saltHex: string,
  expectedHex: string,
): boolean {
  try {
    const a = Buffer.from(hashPassword(password, saltHex), "hex");
    const b = Buffer.from(expectedHex, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const newSalt = () => randomBytes(16).toString("hex");

/* ── OTP helpers — 6 digits, 10-min expiry, 5 attempts ────────── */

function generateOtp(): string {
  // Cryptographically random, uniform over 000000–999999.
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

const hashCode = (code: string, email: string) =>
  scryptSync(code, `otp:${email.trim().toLowerCase()}`, 32).toString("hex");

/* ── Resend email — responsive Vietnamese HTML template ───────── */

const FROM = "Shop Bảo Ngọc <onboarding@resend.dev>";

function otpEmailHtml(code: string): string {
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px;"><div style="width:52px;height:64px;line-height:64px;text-align:center;font-size:30px;font-weight:700;color:#3b2a32;background:#fdf2f6;border:1px solid #f6dfe8;border-radius:14px;font-family:Georgia,'Times New Roman',serif;">${d}</div></td>`,
    )
    .join("");

  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Mã xác thực</title></head>
<body style="margin:0;padding:0;background:#fef8fa;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Mã xác thực của bạn là ${code}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef8fa;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #f6dfe8;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#3a2030;padding:28px 24px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#fdf2f6;letter-spacing:0.06em;">Shop Thời Trang &amp; Phụ Kiện Nữ Bảo Ngọc.</div>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;font-family:Arial,Helvetica,sans-serif;">
          <h1 style="margin:0;font-size:20px;color:#3b2a32;">Mã xác thực của bạn</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#7d6470;">Dùng mã 6 chữ số dưới đây để tiếp tục. Mã có hiệu lực trong <strong style="color:#b8496f;">10 phút</strong> — không chia sẻ mã này với bất kỳ ai.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 8px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#7d6470;">Nếu bạn không yêu cầu mã này, bạn có thể bỏ qua email này một cách an toàn.</p>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;font-size:12px;color:#b399a5;">© 2026 Shop Thời Trang &amp; Phụ Kiện Nữ Bảo Ngọc. — Hotline 0793578058</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════
   Actions — backend for the unified login flow
   ═════════════════════════════════════════════════════════════ */

/** ISSUE: hash the code, store the record, send via Resend. */
export const requestOtpAction = internalAction({
  args: {
    email: v.string(),
    purpose: v.union(v.literal("register"), v.literal("reset")),
  },
  handler: async (ctx, { email, purpose }) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw new Error("Email không hợp lệ.");

    const code = generateOtp();
    const codeHash = hashCode(code, normalized);

    // Persist (default runtime) — invalidates any outstanding code.
    await ctx.runMutation(internal.otpStore.issueOtp, {
      email: normalized,
      purpose,
      codeHash,
    });

    // Deliver via Resend (RESEND_API_KEY from the project's env settings).
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY chưa được cấu hình — hãy thêm key trong phần Keys/API keys của dự án.",
      );
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: normalized,
      subject: "Mã xác thực - Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc",
      html: otpEmailHtml(code),
    });
    if (error) throw new Error(`Không gửi được email: ${error.message}`);
    return { sent: true as const };
  },
});

/** Public wrapper the client calls; schedules the internal send action.
 *  (Lives in otpStore.ts — mutations can't be defined in this node file.) */

/** VERIFY + REGISTER: check the register-OTP, create the account with the
 *  chosen password, consume the code — one round-trip, no race window. */
export const completeRegistration = action({
  args: {
    email: v.string(),
    code: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, code, password, name }) => {
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    const normalized = email.trim().toLowerCase();
    const inputHash = hashCode(code.trim(), normalized);
    const verdict = await ctx.runMutation(internal.otpStore.consumeOtpRecord, {
      email: normalized,
      purpose: "register",
      inputCodeHash: inputHash,
    });
    if (!verdict.ok) throw new Error(verdict.reason);

    const salt = newSalt();
    await ctx.runMutation(internal.customers.createAccount, {
      email: normalized,
      passwordHash: hashPassword(password, salt),
      salt,
      ...(name?.trim() ? { name: name.trim() } : {}),
    });
    return { created: true as const, email: normalized };
  },
});

/** Forgot-password final step: verify reset-OTP, set the new password. */
export const resetPassword = action({
  args: { email: v.string(), code: v.string(), password: v.string() },
  handler: async (ctx, { email, code, password }) => {
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    const normalized = email.trim().toLowerCase();
    const inputHash = hashCode(code.trim(), normalized);
    const verdict = await ctx.runMutation(internal.otpStore.consumeOtpRecord, {
      email: normalized,
      purpose: "reset",
      inputCodeHash: inputHash,
    });
    if (!verdict.ok) throw new Error(verdict.reason);

    const salt = newSalt();
    await ctx.runMutation(internal.customers.setPassword, {
      email: normalized,
      passwordHash: hashPassword(password, salt),
      salt,
    });
    return { reset: true as const, email: normalized };
  },
});

/** Returning-customer sign-in: verify the password against the stored
 *  scrypt hash. No OTP is involved on this path. */
export const signInWithPassword = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) throw new Error("Email không hợp lệ.");
    const creds = await ctx.runQuery(internal.customers.credentialsInternal, {
      email: normalized,
    });
    if (!creds) throw new Error("Không tìm thấy tài khoản với email này.");
    if (!verifyPassword(password, creds.salt, creds.passwordHash)) {
      throw new Error("Mật khẩu không đúng. Thử lại hoặc chọn Quên mật khẩu.");
    }
    return { ok: true as const, email: normalized };
  },
});
