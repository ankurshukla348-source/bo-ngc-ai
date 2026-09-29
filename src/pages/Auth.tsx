import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PIN, tryUnlockAdmin } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
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

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { t } = useI18n();
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  // Signed-in customers skip the form straight to their destination.
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

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

          {/* Single unified portal — customers use email/OTP, the store
              owner's credentials sign straight into the dashboard. */}
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <CustomerForm
              signIn={signIn}
              authLoading={authLoading}
              onDone={() => navigate(redirect)}
              onOwnerDone={() => navigate("/seller")}
            />
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

/* ── Customer: email → 6-digit code, or guest ──────────────── */

function CustomerForm({
  signIn,
  authLoading,
  onDone,
  onOwnerDone,
}: {
  signIn: (provider: string, formData?: FormData) => Promise<unknown>;
  authLoading: boolean;
  onDone: () => void;
  /** Store-owner credentials verified → straight to the seller dashboard. */
  onOwnerDone: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerMode, setOwnerMode] = useState(false);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const enteredEmail = String(formData.get("email") ?? "").trim().toLowerCase();

      // Unified portal: the store owner signs in with email + password and
      // lands straight in the seller dashboard — no OTP, no PIN gate.
      if (enteredEmail === ADMIN_EMAIL) {
        setOwnerMode(true);
        setEmail(enteredEmail);
        setIsLoading(false);
        return;
      }

      setOwnerMode(false);
      await signIn("email-otp", formData);
      setEmail(formData.get("email") as string);
      setStep("code");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /** Owner password check — unlocks the dashboard session directly. */
  const handleOwnerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (password === ADMIN_PASSWORD) {
      tryUnlockAdmin(ADMIN_PIN); // reuse the shared dashboard session flag
      onOwnerDone();
    } else {
      setError(t("sellerError"));
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", otp);
      await signIn("email-otp", formData);
      onDone();
    } catch {
      setError("The verification code you entered is incorrect.");
      setOtp("");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      onDone();
    } catch (err) {
      setError(
        `Failed to sign in as guest: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  /* Owner password step — only reachable when the owner email was entered. */
  if (ownerMode) {
    return (
      <form onSubmit={handleOwnerSubmit} className="flex flex-col gap-5">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
            <Lock className="size-5 text-brand-rose" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {t("sellerTitle")}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {email}
          </p>
        </div>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("accessCodeLabel")}
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            className="mt-1.5 h-12 rounded-2xl text-center font-mono text-lg tracking-[0.3em]"
          />
        </label>

        {error && (
          <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 rounded-full">
          {t("sellerEnter")}
          <ArrowRight className="ml-2 size-4" />
        </Button>

        <button
          type="button"
          onClick={() => {
            setOwnerMode(false);
            setError(null);
          }}
          className="text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("backToEmail")}
        </button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
            <Mail className="size-5 text-brand-rose" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {t("codeSent")}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {email}
          </p>
        </div>

        <input type="hidden" name="code" value={otp} />
        <div className="flex justify-center">
          <InputOTP
            value={otp}
            onChange={setOtp}
            maxLength={6}
            disabled={isLoading}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isLoading || otp.length !== 6} className="h-11 rounded-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("verifying")}
            </>
          ) : (
            <>
              {t("verify")}
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => {
            setStep("email");
            setOtp("");
            setError(null);
          }}
          className="text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("backToEmail")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{t("authWelcome")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("authSub")}</p>
      </div>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("emailLabel")}
          <div className="relative mt-1.5">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="email"
              type="email"
              required
              disabled={isLoading}
              placeholder="name@example.com"
              className="h-11 rounded-full pl-10"
            />
          </div>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading || authLoading}
          className="h-11 rounded-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              {t("sendCode")}
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="relative py-1 text-center">
        <span className="absolute inset-0 top-1/2 h-px bg-border" />
        <span className="relative bg-card px-3 text-xs uppercase tracking-widest text-muted-foreground">
          {t("orDivider")}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGuestLogin}
        disabled={isLoading}
        className="h-11 rounded-full"
      >
        <UserX className="mr-2 size-4" />
        {t("guestCta")}
      </Button>
      <p className="-mt-3 text-center text-xs text-muted-foreground">
        {t("guestHint")}
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
