import { Header } from "@/components/store/Header";
import { api } from "@/convex/_generated/api";
import { useCart, type CartItem } from "@/lib/cart";
import { shippingFeeFor } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { useI18n, type Lang } from "@/lib/i18n";
import { buildVietqrPayload } from "@/lib/vietqr";
import { cn } from "@/lib/utils";
import { useConvex, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Banknote,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Minus,
  Pencil,
  Plus,
  QrCode,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { Component, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

type Shipping = {
  name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  note: string;
};

type PaymentMethod = "vietqr" | "cod";

type BankInfo = {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
};

type ConfirmedOrder = {
  orderCode: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: number;
  items: CartItem[];
  customer: Shipping;
  paymentMethod: PaymentMethod;
};

const BLANK_SHIPPING: Shipping = {
  name: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  street: "",
  note: "",
};

function methodLabel(method: PaymentMethod, lang: Lang): string {
  if (method === "vietqr") {
    return lang === "vi" ? "Chuyển khoản VietQR" : "VietQR bank transfer";
  }
  return lang === "vi" ? "Tiền mặt khi nhận hàng" : "Cash on delivery";
}

/* ── small building blocks ─────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-full border border-border bg-background px-4 text-sm normal-case tracking-normal text-foreground outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:bg-card"
      />
    </label>
  );
}

function StepBadge({ step, done }: { step: string; done: boolean }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold",
        done ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
      )}
    >
      {done ? <Check className="size-4" strokeWidth={3} /> : step}
    </span>
  );
}

/**
 * One checkout step.
 *
 * Deliberately NOT a Radix Accordion: Radix `Presence` unmounts collapsed
 * content from an `animationend` callback, i.e. it edits the DOM outside
 * React's commit. The next React commit into that subtree then throws
 * `NotFoundError: Failed to execute 'insertBefore' on 'Node'`, which tears
 * down the whole page right after the order is placed.
 *
 * Here the body is always mounted and only its `hidden` attribute changes, so
 * React is the only thing that ever adds or removes a node in this flow.
 */
function Step({
  n,
  title,
  sub,
  done,
  open,
  onToggle,
  children,
}: {
  n: string;
  title: string;
  sub?: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-5 text-left transition-colors hover:bg-secondary/40"
      >
        <StepBadge step={n} done={done} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">{title}</span>
          {sub && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div hidden={!open} className="px-5 pb-6">
        {children}
      </div>
    </section>
  );
}

function PayOption({
  selected,
  disabled,
  onSelect,
  icon: Icon,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: typeof QrCode;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border border-border p-4 text-left transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-background hover:bg-secondary",
        disabled &&
          "cursor-not-allowed bg-muted text-muted-foreground opacity-70 hover:bg-muted",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center border-2 border-current">
        {selected && <span className="size-2 bg-current" />}
      </span>
      <Icon className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold uppercase tracking-wide">
          {title}
        </span>
        <span
          className={cn(
            "block text-xs",
            selected ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {desc}
        </span>
      </span>
      {badge && (
        <span className="shrink-0 border-2 border-current px-2 py-1 text-[10px] font-bold uppercase">
          {badge}
        </span>
      )}
    </button>
  );
}

function Totals({
  subtotal,
  fee,
  total,
  t,
}: {
  subtotal: number;
  fee: number;
  total: number;
  t: (key: "subtotal" | "shipping" | "total" | "free") => string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span className="font-semibold tabular-nums">{formatVnd(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("shipping")}</span>
        <span className="font-semibold tabular-nums">
          {fee === 0 ? t("free") : formatVnd(fee)}
        </span>
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-semibold uppercase tracking-widest">
          {t("total")}
        </span>
        <span className="font-display text-2xl font-bold tabular-nums">
          {formatVnd(total)}
        </span>
      </div>
    </div>
  );
}

/** Never surface an empty error. Convex client errors can carry a
 *  whitespace-only message, which would paint a blank red box. */
function describeError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 200) : fallback;
}

/** Checkout error alert. The message is always readable wording. */
function ErrorNote({
  message,
  title,
}: {
  message: string | null;
  title?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="text-xs font-semibold leading-relaxed">
        {title && <span className="block">{title}</span>}
        <span className="block font-normal opacity-90">{message}</span>
      </p>
    </div>
  );
}

/* ── confirmation screen ───────────────────────────────────── */

/** Keeps the order ID on screen if anything inside the confirmation throws. */
class SafeBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function OrderFallback({ code, total }: { code: string; total: number }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        {t("confirmTitle")}
      </h1>
      <p className="text-muted-foreground">{t("confirmBody")}</p>
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {t("orderCode")}
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-[0.15em] sm:text-3xl">
          {code}
        </p>
        <p className="mt-3 text-sm font-medium tabular-nums">
          {t("total")} · {formatVnd(total)}
        </p>
      </div>
      <Link
        to="/"
        className="rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}

function Confirmation({ order }: { order: ConfirmedOrder }) {
  const { t, lang } = useI18n();
  const payment = useQuery(api.settings.getPayment);
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () =>
      payment
        ? buildVietqrPayload({
            ...payment,
            amount: order.total,
            reference: order.orderCode,
          })
        : "",
    [payment, order],
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order.orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      {/* Success */}
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center border border-border bg-accent text-accent-foreground shadow-soft">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {t("confirmTitle")}
        </h1>
        <p className="text-muted-foreground">{t("confirmBody")}</p>
      </div>

      {/* Order ID */}
      <div className="border border-border bg-card p-6 text-center shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {t("orderCode")}
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-[0.15em] sm:text-3xl">
          {order.orderCode}
        </p>
        <button
          type="button"
          onClick={copyCode}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold uppercase transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? t("copied") : t("copy")}
        </button>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("orderPlacedAt")}{" "}
          {new Date(order.createdAt).toLocaleString(
            lang === "vi" ? "vi-VN" : "en-GB",
          )}
        </p>
      </div>

      {/* Payment instructions */}
      <div className="border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3.5 font-display text-lg font-bold">
          {t("paymentInstructions")}
        </h2>
        <div className="p-5">
          {order.paymentMethod === "vietqr" ? (
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="shrink-0 self-start rounded-2xl border border-border bg-white p-2 shadow-soft">
                {payload ? (
                  <SafeBoundary
                    fallback={
                      <div className="flex h-[168px] w-[168px] items-center justify-center px-3 text-center text-[11px] leading-snug text-muted-foreground">
                        {t("qrUnavailable")}
                      </div>
                    }
                  >
                    <QRCodeSVG value={payload} size={168} />
                  </SafeBoundary>
                ) : (
                  <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-muted-foreground">
                    …
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("bankDetails")}
                </p>
                <p className="font-display text-lg font-bold">
                  {payment?.bankName ?? "…"}
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">
                    {t("accountNoL")}
                  </span>
                  <span className="text-right font-semibold tabular-nums">
                    {payment?.accountNo ?? "…"}
                  </span>
                  <span className="text-muted-foreground">{t("holderL")}</span>
                  <span className="text-right font-semibold">
                    {payment?.accountHolder ?? "…"}
                  </span>
                </div>
                <div className="flex items-center justify-between border border-border bg-secondary px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {t("amountDue")}
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    {formatVnd(order.total)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("transferNote")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("codInstructions")}
            </p>
          )}
        </div>
      </div>

      {/* Order detail */}
      <div className="border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3.5 font-display text-lg font-bold">
          {t("orderDetail")}
        </h2>
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 p-4">
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {lang === "vi" ? item.nameVi : item.nameEn}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.size} · {t("qtyLabel")} {item.qty}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums">
                {formatVnd(item.price * item.qty)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-5">
          <Totals
            subtotal={order.subtotal}
            fee={order.shippingFee}
            total={order.total}
            t={t}
          />
        </div>
        <div className="grid gap-5 border-t border-border p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("reviewShipTo")}
            </p>
            <p className="mt-2 font-semibold">{order.customer.name}</p>
            <p className="tabular-nums text-muted-foreground">
              {order.customer.phone}
            </p>
            <p className="mt-1 text-muted-foreground">
              {order.customer.street}, {order.customer.ward},{" "}
              {order.customer.district}, {order.customer.province}
            </p>
            {order.customer.note && (
              <p className="mt-1 italic text-muted-foreground">
                {order.customer.note}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("reviewPayment")}
            </p>
            <p className="mt-2 font-semibold">
              {methodLabel(order.paymentMethod, lang)}
            </p>
          </div>
        </div>
      </div>

      <Link
        to="/"
        className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
      >
        {t("continueShopping")}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* ── empty cart ────────────────────────────────────────────── */

function EmptyCart() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="flex size-16 items-center justify-center overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <ShoppingBag className="size-7" />
      </span>
      <h1 className="font-display text-3xl font-bold">{t("emptyCartTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("emptyCartBody")}</p>
      <Link
        to="/"
        className="rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}

/* ── page ──────────────────────────────────────────────────── */

export default function Checkout() {
  const { t, lang } = useI18n();
  const { items, subtotal, setQty, remove, clear } = useCart();
  const convex = useConvex();

  const [open, setOpen] = useState<string[]>(["ship"]);
  const [shipping, setShipping] = useState<Shipping>(BLANK_SHIPPING);
  const [shipDone, setShipDone] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("vietqr");
  const [payDone, setPayDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);

  const paymentSettings = useQuery(api.settings.getPayment);

  /* Once the order is confirmed the grid is driven by the frozen snapshot
     instead of the live cart, so the deferred clear() below cannot touch the
     grid DOM at all (only the header badge unmounts). Every mutation inside
     the confirm sequence becomes append-only — deletions of grid rows were
     the other half of the insertBefore/removeChild crashes. */
  const gridItems = confirmed ? confirmed.items : items;
  const gridSubtotal = confirmed ? confirmed.subtotal : subtotal;

  const fee = shippingFeeFor(gridSubtotal);
  const total = gridSubtotal + fee;

  const qrPayload = useMemo(
    () =>
      paymentSettings
        ? buildVietqrPayload({ ...paymentSettings, amount: total })
        : "",
    [paymentSettings, total],
  );

  const setField = (field: keyof Shipping, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value }));

  const toggle = (step: string) =>
    setOpen((prev) => (prev.includes(step) ? [] : [step]));

  const addressValid =
    shipping.name.trim() &&
    shipping.phone.trim() &&
    shipping.province.trim() &&
    shipping.district.trim() &&
    shipping.ward.trim() &&
    shipping.street.trim();

  const handleShipContinue = () => {
    if (!addressValid) {
      setError(t("addressRequired"));
      return;
    }
    setError(null);
    setShipDone(true);
    setOpen(["pay"]);
  };

  const handlePayContinue = () => {
    setPayDone(true);
    setError(null);
    setOpen(["review"]);
  };

  const submitOrder = () =>
    convex.mutation(api.orders.create, {
      items: items.map((item) => ({
        productId: item.productId,
        nameVi: item.nameVi,
        nameEn: item.nameEn,
        price: item.price,
        size: item.size,
        qty: item.qty,
        ...(item.image ? { imageSrc: item.image } : {}),
      })),
      customer: {
        name: shipping.name,
        phone: shipping.phone,
        province: shipping.province,
        district: shipping.district,
        ward: shipping.ward,
        street: shipping.street,
        ...(shipping.note.trim() ? { note: shipping.note.trim() } : {}),
      },
      paymentMethod: method,
    });

  /** Only transport hiccups are retried: a rejected mutation means nothing
   *  was written, but a dropped response might mean it already exists. */
  const isTransportError = (err: unknown) =>
    err instanceof Error &&
    /failed to fetch|network|timeout|socket|load failed/i.test(err.message);

  const handlePlaceOrder = async () => {
    if (!shipDone) {
      setOpen(["ship"]);
      setError(t("addressRequired"));
      return;
    }
    if (!payDone) {
      setOpen(["pay"]);
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const snapshot = items;
      const result = await (async () => {
        try {
          return await submitOrder();
        } catch (firstError) {
          if (!isTransportError(firstError)) throw firstError;
          await new Promise((resolve) => setTimeout(resolve, 700));
          return await submitOrder();
        }
      })();
      setConfirmed({
        ...result,
        items: snapshot,
        customer: shipping,
        paymentMethod: method,
      });
      window.scrollTo({ top: 0 });
      // Emptying the cart unmounts the header badge; doing that in the same
      // commit that mounts the confirmation is part of the giant DOM swap
      // that crashed React's DOM placement. Defer it so it lands in its own
      // small, separate commit.
      setTimeout(() => clear(), 0);
    } catch (orderError) {
      // Surface the real reason (network, validation, Convex) instead of a
      // blanket message — this is the only clue when a payout fails.
      console.error("[checkout] could not place order", orderError);
      setError(describeError(orderError, t("checkoutError")));
    } finally {
      setPlacing(false);
    }
  };

  const paymentSummary = shipDone
    ? `${shipping.ward}, ${shipping.district}, ${shipping.province}`
    : t("step1Sub");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Zero-friction reminder: an account is optional — checkout stays open
          to everyone (guest checkout, no email verification required). */}
      <p className="mx-auto max-w-6xl px-4 pt-4 text-xs text-muted-foreground sm:px-6">
        {t("guestCheckoutNote")}
      </p>

      {/* Confirmation and checkout live in two always-mounted slots: placing
          an order only toggles the `hidden` attribute and appends the
          confirmation into an existing parent — instead of unmounting the
          whole checkout grid and mounting the confirmation as swapping
          siblings in one giant commit (which crashed React's insertBefore
          placement). The wrappers carry no display class so the `hidden`
          attribute always wins. */}
      <div hidden={!confirmed}>
        {confirmed && (
          /* The order ID is the one thing the customer must never lose, so a
             failure inside the confirmation (e.g. the QR renderer) degrades to
             a plain order summary instead of a blank/error screen. */
          <SafeBoundary
            fallback={<OrderFallback code={confirmed.orderCode} total={confirmed.total} />}
          >
            <Confirmation order={confirmed} />
          </SafeBoundary>
        )}
      </div>

      <div hidden={!!confirmed}>
        {/* The grid deliberately stays mounted (hidden) once the order is
            placed, even after the deferred clear() empties the cart: swapping
            it for <EmptyCart/> would delete hundreds of DOM nodes inside the
            confirm commit, and one failed deletion poisons every later
            placement (the insertBefore/removeChild crashes). A hidden, emptied
            grid is harmless — EmptyCart only shows pre-confirm. */}
        {gridItems.length === 0 && !confirmed ? (
          <EmptyCart />
        ) : (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Page head */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                {t("continueShopping")}
              </Link>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("checkoutTitle")}
              </h1>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {gridItems.length} · {formatVnd(total)}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* ── Checkout steps ── */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              {/* Step 1 — shipping */}
              <Step
                n="01"
                title={t("step1")}
                sub={paymentSummary}
                done={shipDone}
                open={open.includes("ship")}
                onToggle={() => toggle("ship")}
              >
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t("step1Sub")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("fullName")}
                      value={shipping.name}
                      onChange={(v) => setField("name", v)}
                      placeholder="Nguyễn Thị Bảo Ngọc"
                    />
                    <Field
                      label={t("phone")}
                      type="tel"
                      value={shipping.phone}
                      onChange={(v) => setField("phone", v)}
                      placeholder="0909 123 456"
                    />
                    <Field
                      label={t("province")}
                      value={shipping.province}
                      onChange={(v) => setField("province", v)}
                      placeholder="Hà Nội"
                    />
                    <Field
                      label={t("district")}
                      value={shipping.district}
                      onChange={(v) => setField("district", v)}
                      placeholder="Cầu Giấy"
                    />
                    <Field
                      label={t("ward")}
                      value={shipping.ward}
                      onChange={(v) => setField("ward", v)}
                      placeholder="Dịch Vọng"
                    />
                    <Field
                      label={t("street")}
                      value={shipping.street}
                      onChange={(v) => setField("street", v)}
                      placeholder="12 Đường Thành Thái"
                    />
                    <Field
                      label={t("orderNote")}
                      value={shipping.note}
                      onChange={(v) => setField("note", v)}
                      placeholder="Gọi trước khi giao…"
                      className="sm:col-span-2"
                    />
                  </div>

                  <ErrorNote message={error} />

                  <button
                    type="button"
                    onClick={handleShipContinue}
                    className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 sm:w-auto sm:px-8"
                  >
                    {t("continuePayment")}
                    <ArrowRight className="size-4" />
                  </button>
              </Step>

              {/* Step 2 — payment */}
              <Step
                n="02"
                title={t("step2")}
                sub={payDone ? methodLabel(method, lang) : t("step2Sub")}
                done={payDone}
                open={open.includes("pay")}
                onToggle={() => toggle("pay")}
              >
                  <div className="grid gap-3" role="radiogroup">
                    <PayOption
                      selected={method === "vietqr"}
                      onSelect={() => setMethod("vietqr")}
                      icon={QrCode}
                      title={t("payVietqr")}
                      desc={t("payVietqrDesc")}
                    />
                    <PayOption
                      selected={method === "cod"}
                      onSelect={() => setMethod("cod")}
                      icon={Banknote}
                      title={t("payCod")}
                      desc={t("payCodDesc")}
                    />
                    <PayOption
                      selected={false}
                      disabled
                      onSelect={() => {}}
                      icon={Wallet}
                      title={t("payWallet")}
                      desc={t("payWalletDesc")}
                      badge={lang === "vi" ? "Sắp ra mắt" : "Soon"}
                    />
                  </div>

                  {method === "vietqr" && (
                    <div className="mt-4 flex flex-col gap-4 border border-border bg-background p-4 sm:flex-row">
                      <div className="shrink-0 self-center rounded-2xl border border-border bg-white p-2 shadow-soft sm:self-start">
                        {qrPayload ? (
                          <SafeBoundary
                            fallback={
                              <div className="flex h-[168px] w-[168px] items-center justify-center px-3 text-center text-[11px] leading-snug text-muted-foreground">
                                {t("qrUnavailable")}
                              </div>
                            }
                          >
                            <QRCodeSVG value={qrPayload} size={168} />
                          </SafeBoundary>
                        ) : (
                          <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-muted-foreground">
                            …
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {t("bankDetails")}
                        </p>
                        <p className="font-display text-lg font-bold">
                          {paymentSettings?.bankName ?? "…"}
                        </p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                          <span className="text-muted-foreground">
                            {t("accountNoL")}
                          </span>
                          <span className="truncate text-right font-semibold tabular-nums">
                            {paymentSettings?.accountNo ?? "…"}
                          </span>
                          <span className="text-muted-foreground">
                            {t("holderL")}
                          </span>
                          <span className="truncate text-right font-semibold">
                            {paymentSettings?.accountHolder ?? "…"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border border-border bg-secondary px-3 py-2.5">
                          <span className="text-xs font-semibold uppercase tracking-widest">
                            {t("amountDue")}
                          </span>
                          <span className="font-display text-xl font-bold tabular-nums">
                            {formatVnd(total)}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {t("transferNote")}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePayContinue}
                    className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 sm:w-auto sm:px-8"
                  >
                    {t("continueReview")}
                    <ArrowRight className="size-4" />
                  </button>
              </Step>

              {/* Step 3 — review & place */}
              <Step
                n="03"
                title={t("step3")}
                sub={t("step3Sub")}
                done={confirmed !== null}
                open={open.includes("review")}
                onToggle={() => toggle("review")}
              >
                  {/* Address + payment recap */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border border-border bg-background p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {t("reviewShipTo")}
                        </p>
                        <button
                          type="button"
                          onClick={() => setOpen(["ship"])}
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase underline-offset-4 hover:underline"
                        >
                          <Pencil className="size-3" />
                          {t("edit")}
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {shipping.name} · {shipping.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shipping.street}, {shipping.ward}, {shipping.district},{" "}
                        {shipping.province}
                      </p>
                    </div>
                    <div className="border border-border bg-background p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {t("reviewPayment")}
                        </p>
                        <button
                          type="button"
                          onClick={() => setOpen(["pay"])}
                          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase underline-offset-4 hover:underline"
                        >
                          <Pencil className="size-3" />
                          {t("edit")}
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {methodLabel(method, lang)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shipping.note
                          ? shipping.note
                          : method === "vietqr"
                            ? t("payVietqrDesc")
                            : t("payCodDesc")}
                      </p>
                    </div>
                  </div>

                  {/* Itemized breakdown */}
                  <div className="mt-4 border border-border bg-background">
                    <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest">
                      {t("orderSummary")}
                    </p>
                    <ul className="divide-y divide-border">
                      {gridItems.map((item) => (
                        <li
                          key={item.key}
                          className="flex items-center gap-3 px-4 py-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {lang === "vi" ? item.nameVi : item.nameEn}
                            <span className="text-muted-foreground">
                              {" "}
                              · {item.size} × {item.qty}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums">
                            {formatVnd(item.price * item.qty)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-border px-4 py-4">
                      <Totals
                        subtotal={gridSubtotal}
                        fee={fee}
                        total={total}
                        t={t}
                      />
                    </div>
                  </div>

                  <ErrorNote message={error} title={t("checkoutError")} />

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={placing}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:pointer-events-none disabled:opacity-60"
                  >
                    {placing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t("placing")}
                      </>
                    ) : (
                      <>
                        {t("placeOrder")} · {formatVnd(total)}
                      </>
                    )}
                  </button>
              </Step>
            </div>

            {/* ── Live cart summary ── */}
            <aside className="self-start lg:sticky lg:top-32">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <h2 className="border-b border-border px-5 py-3.5 font-display text-lg font-bold">
                  {t("yourCart")}
                </h2>
                <ul className="max-h-[340px] divide-y divide-border overflow-y-auto">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3 p-4">
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug">
                            {lang === "vi" ? item.nameVi : item.nameEn}
                          </p>
                          <button
                            type="button"
                            onClick={() => remove(item.key)}
                            aria-label={t("delete")}
                            className="shrink-0 border border-border bg-background p-0.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.size}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center border border-border">
                            <button
                              type="button"
                              onClick={() => setQty(item.key, item.qty - 1)}
                              aria-label="−"
                              className="flex size-7 items-center justify-center transition-colors hover:bg-secondary"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold tabular-nums">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(item.key, item.qty + 1)}
                              aria-label="+"
                              className="flex size-7 items-center justify-center transition-colors hover:bg-secondary"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold tabular-nums">
                            {formatVnd(item.price * item.qty)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border p-5">
                  <Totals subtotal={gridSubtotal} fee={fee} total={total} t={t} />
                </div>
              </div>
            </aside>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
