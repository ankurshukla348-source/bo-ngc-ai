import { Header } from "@/components/store/Header";
import { MarketingOptIn } from "@/components/store/MarketingOptIn";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useMutation } from "convex/react";
import { Heart, LogOut, Package, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

const WISHLIST_KEY = "mama-wishlist-v1";

function readWishlistCount(): number {
  try {
    const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** Signed-in customer area. Order history stays out of v1 (see README). */
export default function Dashboard() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [wishlistCount] = useState(readWishlistCount);

  // Consent lives on the profile; absent means "subscribed" (opt-out model).
  const [optIn, setOptIn] = useState(user?.marketingOptIn !== false);
  const saveOptIn = useMutation(api.users.setMarketingOptIn);

  useEffect(() => {
    if (user) setOptIn(user.marketingOptIn !== false);
  }, [user]);

  const handleOptInChange = (next: boolean) => {
    setOptIn(next);
    void saveOptIn({ optedIn: next }).catch(() => {
      /* revert on failure — the checkbox must not lie about what is stored */
      setOptIn(!next);
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {t("accountTitle")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
          {t("authWelcome")}
          {user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("authSub")}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Orders */}
          <section className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <Package className="size-5 text-brand-rose" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">
              {t("ordersTitle")}
            </h2>
            <p className="mt-2 text-sm font-medium">{t("ordersEmpty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("ordersNote")}</p>
            <Link
              to="/"
              className="mt-5 w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              {t("continueShopping")}
            </Link>
          </section>

          {/* Wishlist */}
          <section className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <Heart className="size-5 text-brand-rose" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">
              {t("wishlistTitle")}
            </h2>
            {wishlistCount > 0 ? (
              <p className="mt-2 text-sm font-medium tabular-nums">
                {wishlistCount} {t("wishlistCount")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("wishlistEmpty")}
              </p>
            )}
            <Link
              to="/"
              className="mt-5 w-fit rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {t("ctaShop")}
            </Link>
          </section>

          {/* Account details */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <UserRound className="size-5 text-brand-rose" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">
              {t("accountInfo")}
            </h2>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("accountEmail")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {user?.email ?? user?.name ?? "—"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("accountInfoHint")}
            </p>
            <MarketingOptIn checked={optIn} onChange={handleOptInChange} />
          </section>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <LogOut className="size-4" />
          {t("signOutLabel")}
        </button>
      </main>
    </div>
  );
}
