import { Header } from "@/components/store/Header";
import { MarketingOptIn } from "@/components/store/MarketingOptIn";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import { ReviewSection } from "@/components/store/ReviewSection";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PAYMENT_LABELS_EN, PAYMENT_LABELS_VI } from "@/lib/orders";
import { useMutation, useQuery } from "convex/react";
import { Heart, LogOut, Package, Store, UserRound } from "lucide-react";
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

function orderDate(ts: number | undefined, lang: "vi" | "en") {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) return "—";
  try {
    return new Date(ts).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/** Signed-in customer area: order tracking, wishlist and account settings. */
export default function Dashboard() {
  const { t, lang } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [wishlistCount] = useState(readWishlistCount);

  // Reactive: the admin changing a status updates these cards immediately.
  const orders = useQuery(api.orders.mine, {});

  // Only the store owner ever sees the seller shortcut — customers must not
  // be offered a way into /seller.
  const isOwner =
    (user?.email ?? "").trim().toLowerCase() === ADMIN_EMAIL;

  // Consent lives on the profile; absent means "subscribed" (opt-out model).
  const [optIn, setOptIn] = useState(user?.marketingOptIn !== false);
  const saveOptIn = useMutation(api.users.setMarketingOptIn);

  /* Reviews: only products from a DELIVERED order of this account, and only
     those not already reviewed. The server re-checks all of this on submit. */
  const reviewable = useQuery(api.reviews.reviewable, {});

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
          {/* Orders — live status set by the shop */}
          <section className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <Package className="size-5 text-brand-rose" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">
              {t("ordersTitle")}
            </h2>

            {orders === undefined ? (
              <p className="mt-2 text-sm text-muted-foreground">…</p>
            ) : orders.length === 0 ? (
              <>
                <p className="mt-2 text-sm font-medium">{t("ordersEmpty")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("ordersNote")}
                </p>
                <Link
                  to="/"
                  className="mt-5 w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  {t("continueShopping")}
                </Link>
              </>
            ) : (
              <ul className="mt-3 space-y-3">
                {orders.map((order) => {
                  /* Defensive on purpose: `orders.mine` normalises rows
                     server-side, but this list must never be the thing that
                     blanks /account. A missing `items` array renders an
                     explicit fallback line instead of throwing. */
                  const items = Array.isArray(order.items) ? order.items : [];
                  const summary =
                    items
                      .map(
                        (item) =>
                          `${
                            item?.nameVi || item?.nameEn || "—"
                          } ×${item?.qty ?? 1}${
                            item?.size ? ` (${item.size})` : ""
                          }`,
                      )
                      .join(" · ") || t("ordersItemsUnavailable");
                  return (
                  <li
                    key={order._id}
                    className="rounded-2xl border border-border bg-background p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold tabular-nums">
                        {order.orderCode || "—"}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {orderDate(order.createdAt, lang)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {summary}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {lang === "vi"
                          ? (PAYMENT_LABELS_VI[order.paymentMethod] ??
                            order.paymentMethod)
                          : (PAYMENT_LABELS_EN[order.paymentMethod] ??
                            order.paymentMethod)}
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatVnd(order.total)}
                      </span>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
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

          {/* Seller shortcut — store owner only */}
          {isOwner && (
            <section className="flex flex-col rounded-3xl border border-border bg-secondary p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-card">
                <Store className="size-5 text-brand-rose" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold">
                {t("sellerDashboardTitle")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("sellerDashboardBody")}
              </p>
              <Link
                to="/seller"
                className="mt-5 w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                {t("sellerDashboardCta")}
              </Link>
            </section>
          )}
        </div>

        {/* ── Review delivered products ── */}
        <section className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-bold">
            {t("reviewSectionTitle")}
          </h2>
          {reviewable === undefined ? (
            <p className="mt-2 text-sm text-muted-foreground">…</p>
          ) : reviewable.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("reviewEmptyState")}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-5">
              {reviewable.map((entry) => (
                <li key={entry.productId}>
                  <div className="flex items-center gap-3">
                    {entry.image && (
                      <img
                        src={entry.image}
                        alt=""
                        className="size-12 shrink-0 rounded-xl border border-border object-cover"
                      />
                    )}
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {lang === "vi" ? entry.nameVi : entry.nameEn}
                    </p>
                  </div>
                  {entry.reviewed ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("reviewDuplicate")}
                    </p>
                  ) : (
                    <ReviewSection
                      productId={entry.productId}
                      canReview
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

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
