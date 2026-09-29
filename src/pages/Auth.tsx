import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_PIN,
  tryUnlockAdmin,
} from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import { api } from "@/convex/_generated/api";
import { useAction, useConvex, useMutation } from "convex/react";
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
import { toast } from "sonner";

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

type Step =
  | "email" // pick account: existing → password, unknown → register-OTP
  | "password" // returning customer
  | "ownerPassword" // store owner
  | "otp" // register / reset code entry
  | "registerPassword" // new customer sets a password
  | "resetPassword"; // forgot-password sets a new password

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
            <AuthShell redirectAfterAuth={redirectAfterAuth} />
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

/** The unified login flow's step machine — renders whichever step form is
 *  current (email → password / OTP / owner password → new password). */
function AuthShell({ redirectAfterAuth }: AuthProps = {}) {
  const { t } = useI18n();
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"register" | "reset">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  // Registered-account lookup (a query) runs imperatively on submit.
  const convex = useConvex();
  const requestOtp = useMutation(api.otpStore.requestOtp);
  const signIn = useAction(api.authService.signInWithPassword);
  const completeRegistration = useAction(api.authService.completeRegistration);
  const resetPassword = useAction(api.authService.resetPassword);

  // Already signed in → go to destination.
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) navigate(redirect);
  }, [isAuthenticated, navigate, redirect]);

  /* ── Step 1: email ─────────────────────────────────────────── */

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entered = String(new FormData(event.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!entered) return;

    setIsLoading(true);
    setError(null);
    try {
      // Owner bypass — straight to the seller dashboard.
      if (entered === ADMIN_EMAIL) {
        setEmail(entered);
        setStep("ownerPassword");
        return;
      }
      const exists = await convex.query(api.customers.existsByEmail, {
        email: entered,
      });
      setEmail(entered);
      if (exists) {
        setStep("password"); // returning customer → password only
      } else {
        // First-time → send the register OTP via Resend.
        setOtpPurpose("register");
        await requestOtp({ email: entered, purpose: "register" });
        toast.success(t("otpSentToast"));
        setStep("otp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2a: owner password → /seller ─────────────────────── */

  const handleOwnerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(
      new FormData(event.currentTarget).get("password") ?? "",
    );
    if (password === ADMIN_PASSWORD) {
      tryUnlockAdmin(ADMIN_PIN);
      navigate("/seller");
    } else {
      setError(t("sellerError"));
    }
  };

  /* ── Step 2b: returning-customer password ──────────────────── */

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const password = String(
      new FormData(event.currentTarget).get("password") ?? "",
    );
    setIsLoading(true);
    setError(null);
    try {
      await signIn({ email, password });
      startSession({ email, name: null, loggedInAt: Date.now() });
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2c/3: OTP (register + reset) ─────────────────────── */

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await requestOtp({ email, purpose: otpPurpose });
      toast.success(t("otpSentToast"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      // Registration: verify + create the account with the chosen password
      // in one call. Reset: verify happens inside resetPassword too, but we
      // route through the shared password step so the UX stays identical.
      if (otpPurpose === "register") {
        setStep("registerPassword");
      } else {
        setStep("resetPassword");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 3: set password (register / reset) ───────────────── */

  const handleNewPasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (otpPurpose === "register") {
        const displayName = name.trim() || undefined;
        await completeRegistration({
          email,
          code: otp,
          password,
          ...(displayName ? { name: displayName } : {}),
        });
        startSession({
          email,
          name: displayName ?? null,
          loggedInAt: Date.now(),
        });
        toast.success(t("accountCreatedToast"));
      } else {
        await resetPassword({ email, code: otp, password });
        toast.success(t("passwordResetToast"));
      }
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    } finally {
      setIsLoading(false);
    }
  };

  /** Switch an unknown email's pending register flow into a reset flow. */
  const switchToReset = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOtpPurpose("reset");
      await requestOtp({ email, purpose: "reset" });
      toast.success(t("otpSentToast"));
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Forms ─────────────────────────────────────────────────── */

  const backToEmail = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setError(null);
  };

  if (step === "email") {
    return (
      <EmailForm
        key="email"
        onSubmit={handleEmailSubmit}
        isLoading={isLoading}
        error={error}
        onGuest={async () => {
          navigate("/");
        }}
      />
    );
  }

  if (step === "ownerPassword") {
    return (
      <PasswordForm
        title={t("sellerTitle")}
        subtitle={email}
        label={t("accessCodeLabel")}
        submitLabel={t("sellerEnter")}
        onSubmit={handleOwnerSubmit}
        isLoading={false}
        error={error}
        onBack={backToEmail}
        autoComplete="current-password"
        monospace
      />
    );
  }

  if (step === "password") {
    return (
      <PasswordForm
        title={t("welcomeBackTitle")}
        subtitle={email}
        label={t("passwordLabel")}
        submitLabel={t("signInCta")}
        onSubmit={handlePasswordSubmit}
        isLoading={isLoading}
        error={error}
        onBack={backToEmail}
        autoComplete="current-password"
      >
        <button
          type="button"
          onClick={switchToReset}
          className="text-center text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          {t("forgotPassword")}
        </button>
      </PasswordForm>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
            <Mail className="size-5 text-brand-rose" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {t("otpTitle")}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {email}
          </p>
        </div>

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

        {error && (
          <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="h-11 rounded-full"
        >
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

        <div className="flex items-center justify-center gap-4 text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
          >
            {t("resendCode")}
          </button>
          <button
            type="button"
            onClick={backToEmail}
            className="font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("backToEmail")}
          </button>
        </div>
      </form>
    );
  }

  // registerPassword / resetPassword
  return (
    <form onSubmit={handleNewPasswordSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <Lock className="size-5 text-brand-rose" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {otpPurpose === "register"
            ? t("createPasswordTitle")
            : t("newPasswordTitle")}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {email}
        </p>
      </div>

      {otpPurpose === "register" && (
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("fullName")}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Thị Bảo Ngọc"
            className="mt-1.5 h-11 rounded-2xl"
          />
        </label>
      )}

      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t("passwordLabel")}
        <Input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={otpPurpose === "register" ? "new-password" : "new-password"}
          className="mt-1.5 h-11 rounded-2xl"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t("confirmPasswordLabel")}
        <Input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1.5 h-11 rounded-2xl"
        />
      </label>

      {error && (
        <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="h-11 rounded-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("saving")}
          </>
        ) : (
          <>
            {otpPurpose === "register" ? t("createAccountCta") : t("savePasswordCta")}
            <ArrowRight className="ml-2 size-4" />
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={backToEmail}
        className="text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("backToEmail")}
      </button>
    </form>
  );
}

/* ── Shared form pieces ────────────────────────────────────── */

function EmailForm({
  onSubmit,
  isLoading,
  error,
  onGuest,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string | null;
  onGuest: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{t("authWelcome")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("authSub")}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
              autoComplete="email"
              className="h-12 rounded-2xl pl-10"
            />
          </div>
        </label>

        {error && (
          <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="h-12 rounded-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              {t("continueCta")}
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
        onClick={onGuest}
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

function PasswordForm({
  title,
  subtitle,
  label,
  submitLabel,
  onSubmit,
  isLoading,
  error,
  onBack,
  autoComplete,
  monospace = false,
  children,
}: {
  title: string;
  subtitle?: string;
  label: string;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  autoComplete: string;
  monospace?: boolean;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
          <Lock className="size-5 text-brand-rose" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        <Input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={`mt-1.5 h-12 rounded-2xl ${
            monospace ? "text-center font-mono text-lg tracking-[0.3em]" : ""
          }`}
        />
      </label>

      {error && (
        <p className="rounded-full bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isLoading} className="h-11 rounded-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("verifying")}
          </>
        ) : (
          <>
            {submitLabel}
            <ArrowRight className="ml-2 size-4" />
          </>
        )}
      </Button>

      {children}

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("backToEmail")}
      </button>
    </form>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
