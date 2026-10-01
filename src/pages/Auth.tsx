import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

/** Inline Google "G" mark so the button reads as real Google Sign-In. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-5", className)}>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Where the browser may go after sign-in.
 *
 * Only a same-origin path is honoured: an absolute URL would leave the app,
 * and `/auth` itself would navigate straight back into this component and spin
 * forever ("signed in but never lands anywhere"). Both fall back to Home.
 */
function sanitizeReturnTo(
  raw: string | null,
  fallback: string,
): string {
  const candidate = (raw ?? "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  // /auth, /auth/anything and ?code= handshakes all land back here.
  if (/^\/auth(\/|$|\?|#)/i.test(candidate)) return fallback;
  return candidate;
}

function AuthInner({
  redirectAfterAuth = "/",
}: {
  redirectAfterAuth?: string;
}) {
  const { t } = useI18n();
  const { isLoading, isProfileLoading, isAuthenticated, user, signIn } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where a customer lands after signing in. `returnTo` wins so RequireAuth
  // can send them back to the page they asked for; otherwise we go Home.
  const returnTo = sanitizeReturnTo(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  // The OAuth round-trip appends ?code=... and ConvexAuthProvider exchanges it
  // for a session. `isLoading` stays true until that exchange settles, and
  // `isProfileLoading` covers the extra tick it takes for the profile document
  // to become readable — the button holds a calm spinner the whole time
  // instead of flashing a signed-out UI.
  //
  // Once BOTH have settled, route the store owner straight to /seller and
  // everyone else onward to wherever they were headed. Both paths are resolved
  // against the CURRENT origin — they must never be pinned to the Convex HTTP
  // host, which serves no frontend.
  const settled = isAuthenticated && !isLoading && !isProfileLoading;
  useEffect(() => {
    if (!settled) return;
    const email = (user?.email ?? "").toLowerCase();
    navigate(email === ADMIN_EMAIL.toLowerCase() ? "/seller" : returnTo, {
      replace: true,
    });
  }, [settled, user, navigate, returnTo]);

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      // The Convex callback hands the browser back to exactly this origin, so
      // the redirect follows whichever deployment the visitor is on (local dev,
      // preview, or production). Without it Convex Auth falls back to SITE_URL
      // — a Convex host that serves no frontend and answers
      // "No matching routes".
      await signIn("google", {
        redirectTo: `${window.location.origin}/auth`,
      });
    } catch {
      setError(
        "Không thể kết nối với Google. Vui lòng kiểm tra lại kết nối rồi thử lại.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-[#3a2030] px-10 py-14 text-[#fdf2f6] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-brand-rose/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-[26rem] rounded-full bg-[#7c4a68]/40 blur-3xl"
        />
        <div className="relative">
          <span className="font-display text-2xl font-bold leading-tight tracking-[0.06em]">
            Shop Thời Trang &amp; Phụ Kiện Nữ Bảo Ngọc.
          </span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Chào mừng trở lại
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Đăng nhập bằng Google để theo dõi đơn hàng, lưu sản phẩm yêu thích và
            nhận ưu đãi dành riêng cho khách hàng của Shop Bảo Ngọc.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-3">
              <Sparkles className="size-4 shrink-0 text-brand-rose" />
              Miễn phí giao hàng cho đơn từ 400.000 VND.
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 shrink-0 text-brand-rose" />
              Hỗ trợ đổi trả Size trong vòng 7 ngày.
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">
          Shop Thời Trang Nữ uy tín hàng đầu tại Diên Khánh.
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center bg-background px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <span className="font-display text-xl font-bold tracking-[0.06em] lg:hidden">
            Shop Bảo Ngọc
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold lg:mt-0">
            Đăng nhập
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sử dụng tài khoản Google của bạn để tiếp tục.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy || isLoading || isProfileLoading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy || isLoading || isProfileLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <GoogleMark />
            )}
            {isLoading || isProfileLoading
              ? "Đang hoàn tất đăng nhập…"
              : "Đăng nhập với Google"}
          </button>

          {error && !isLoading && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            {t("googleSignInHint")}
          </p>

          <Link
            to="/"
            className="mt-8 block text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}

export function AuthPage(props: { redirectAfterAuth?: string }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <AuthInner {...props} />
    </Suspense>
  );
}

export default AuthPage;
