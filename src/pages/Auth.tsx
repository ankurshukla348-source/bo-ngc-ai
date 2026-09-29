import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Suspense, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

/** Google "G" mark, inline so no external asset is needed. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.2h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5H1.4v3C3.4 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4v-3H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l3.8-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C16.9 1.1 14.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l3.8 3c.9-2.9 3.6-4.9 6.8-4.9z"
      />
    </svg>
  );
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Brand panel ── */}
      <aside className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fdf2f6] via-[#fbeaf1] to-[#f7dfe9]" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link
            to="/"
            className="relative block max-w-xs font-display text-xl font-bold leading-snug tracking-[0.06em] xl:text-2xl"
          >
            Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc.
          </Link>
          <div className="relative max-w-md">
            <p className="font-display text-4xl font-bold leading-tight">
              {t("authWelcome")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("authSub")}
            </p>
          </div>
          <p className="relative text-xs text-muted-foreground">{t("rights")}</p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <Link
            to="/"
            className="mb-8 block px-4 text-center font-display text-xl font-bold leading-snug tracking-[0.06em] sm:text-2xl lg:hidden"
          >
            Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc.
          </Link>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <GoogleSignIn redirectAfterAuth={redirectAfterAuth} />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            {t("authTerms")}
          </p>
          <Link
            to="/"
            className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToStore")}
          </Link>
        </div>
      </main>
    </div>
  );
}

/** One-tap Google sign-in card. The store owner's Google account is routed
 *  straight to /seller; every other Google account signs in as a customer. */
function GoogleSignIn({ redirectAfterAuth }: AuthProps = {}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const { isLoading, isAuthenticated, user } = useAuth();
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);

  // Already signed in → route by role. The owner account goes straight to
  // the seller dashboard; everyone else continues as a customer.
  useEffect(() => {
    if (!isAuthenticated) return;
    const email = user?.email?.trim().toLowerCase();
    if (email && email === ADMIN_EMAIL) {
      navigate("/seller", { replace: true });
    } else if (user) {
      navigate(redirect, { replace: true });
    }
    // `user` gate: wait until the profile query has resolved so the owner
    // check never fires on a half-loaded session.
  }, [isAuthenticated, user, navigate, redirect]);

  const handleGoogleSignIn = () => {
    setError(null);
    try {
      // Redirects the browser to Google; Convex Auth completes the flow and
      // returns here, after which the effect above routes by role.
      void signIn("google");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{t("authWelcome")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("authSub")}</p>
      </div>

      {error && (
        <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="h-12 rounded-full border-border bg-card"
      >
        {isLoading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <GoogleMark className="mr-3 size-5" />
        )}
        {t("googleSignInCta")}
        <ArrowRight className="ml-2 size-4" />
      </Button>

      <p className="-mt-1 text-center text-xs text-muted-foreground">
        {t("googleSignInHint")}
      </p>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
