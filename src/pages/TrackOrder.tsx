import { api } from "@/convex/_generated/api";
import { Header } from "@/components/store/Header";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useConvex } from "convex/react";

/**
 * Guest order tracking.
 *
 * Most cash-on-delivery customers never sign in, so `/account` cannot be the
 * only way to see an order. The order code from the confirmation screen plus
 * the phone number used at checkout is enough — and the response is trimmed by
 * the server (masked street, no phone) so a leaked code cannot be turned into
 * a delivery address.
 */
export default function TrackOrder() {
  const { t, lang } = useI18n();
  const convex = useConvex();
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof run>>>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(code: string, tel: string) {
    return convex.query(api.orders.track, { orderCode: code, phone: tel });
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderCode.trim() || !phone.trim()) {
      setError(t("trackMissingFields"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await run(orderCode, phone);
      if (!order) {
        setResult(null);
        setError(t("trackNotFound"));
        return;
      }
      setResult(order);
    } catch {
      setError(t("trackNotFound"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t("trackTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("trackSubtitle")}
        </p>

        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("trackOrderCode")}
            </span>
            <input
              value={orderCode}
              onChange={(event) => setOrderCode(event.target.value)}
              placeholder="BN-260930-1234"
              autoComplete="off"
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("trackPhone")}
            </span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0909 123 456"
              inputMode="tel"
              autoComplete="off"
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Search className="size-4" />
            {t("trackSearch")}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-lg font-bold tabular-nums">
                {result.orderCode}
              </span>
              <OrderStatusBadge status={result.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(result.createdAt).toLocaleString(
                  lang === "vi" ? "vi-VN" : "en-GB",
                )}
              </span>
              <span className="ml-auto font-display text-lg font-bold tabular-nums">
                {formatVnd(result.total)}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("orderCustomer")}
                </p>
                <p className="mt-1.5 text-sm font-semibold">
                  {result.customerName}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {result.addressRedacted
                    ? t("orderAddressRedacted")
                    : [result.streetPreview, result.deliveryArea]
                        .filter(Boolean)
                        .join(", ")}
                </p>
                {result.note && (
                  <p className="mt-1.5 text-xs italic text-muted-foreground">
                    “{result.note}”
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("orderItems")}
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {result.items.map((item, index) => (
                    <li
                      key={`${item.nameVi}-${index}`}
                      className="flex gap-2"
                    >
                      <span className="tabular-nums text-muted-foreground">
                        ×{item.qty}
                      </span>
                      <span className="min-w-0 flex-1">
                        {lang === "vi" ? item.nameVi : item.nameEn}
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.size}
                        </span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatVnd(item.price * item.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("orderPayment")}: {t("payCod")}
                </p>
              </div>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            to="/"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("backToStore")}
          </Link>
        </p>
      </main>
    </div>
  );
}
