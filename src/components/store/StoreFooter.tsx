import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { CATEGORIES, type Category } from "@/lib/catalog";
import { HONEYPOT_FIELD } from "@/lib/antiSpam";
import { useI18n } from "@/lib/i18n";
import { CONTACT, TEXT } from "@/constants/text";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

/** Dark editorial footer: brand + link columns + newsletter, mockup-style. */
export function StoreFooter({
  onCategorySelect,
}: {
  onCategorySelect?: (category: Category) => void;
}) {
  const { t, categoryLabel } = useI18n();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const joinNewsletter = useMutation(api.newsletter.subscribe);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await joinNewsletter({
        email,
        website: honeypot,
        source: "footer",
      });
      if (!result.ok) {
        toast.error(
          result.reason === "rate_limited"
            ? t("newsRateLimited")
            : t("newsBadEmail"),
        );
        return;
      }
      // A repeat signup gets the same thank-you as a new one — it worked, and
      // telling the shopper otherwise would only invite another attempt.
      setSubscribed(true);
      setEmail("");
    } catch {
      toast.error(t("newsFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <footer
      id="contact"
      className="scroll-mt-32 rounded-t-[2rem] bg-[#3a2030] text-[#fdf2f6]"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <span className="font-display text-xl font-bold leading-snug tracking-[0.08em] sm:text-2xl">
              {TEXT.brandFull}
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              {t("footerTagline")}
            </p>
            {/* Real ways to reach the shop. A COD customer deciding whether to
                hand a courier money for lingerie will want a number, not just
                a chat bubble. */}
            <div className="mt-1 flex flex-col gap-2 text-sm">
              <a
                href={CONTACT.phoneHref}
                className="inline-flex w-fit items-center gap-2 text-white transition-colors hover:text-brand-rose"
              >
                <Phone className="size-4 shrink-0 text-white/60" />
                <span className="font-semibold">{CONTACT.phone}</span>
              </a>
              <span className="inline-flex items-center gap-2 text-white/60">
                <MapPin className="size-4 shrink-0" />
                {CONTACT.address}
              </span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
              {t("footerShop")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="#shop"
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {t("viewAllProducts")}
                </a>
              </li>
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => onCategorySelect?.(category)}
                    className="text-left text-white/80 transition-colors hover:text-white"
                  >
                    {categoryLabel(category)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer care */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
              {t("footerSupport")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>
                <Link
                  to="/policy"
                  className="inline-block text-white transition-colors hover:text-white/70"
                >
                  {t("policyLabel")}
                </Link>
              </li>
              <li>{t("supportShipping")}</li>
              <li>{t("supportReturns")}</li>
              <li>{t("supportPayment")}</li>
              <li>
                <Link
                  to="/track"
                  className="inline-block text-white transition-colors hover:text-white/70"
                >
                  {t("trackOrderCta")}
                </Link>
              </li>
              <li className="font-semibold text-white">
                {t("supportLiveChat")}
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
              {t("newsTitle")}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {t("footerNewsSub")}
            </p>
            {subscribed ? (
              <p className="mt-4 rounded-full border border-white/25 px-4 py-2.5 text-xs font-medium text-white/80">
                {t("newsThanks")}
              </p>
            ) : (
              <form
                onSubmit={subscribe}
                className="relative mt-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 p-1.5 pl-4"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("newsPlaceholder")}
                  aria-label={t("newsPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
                {/* Honeypot: hidden from people, tempting to bots. */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  name={HONEYPOT_FIELD}
                  className="absolute -left-[9999px] h-px w-px opacity-0"
                />
                <button
                  type="submit"
                  disabled={pending}
                  aria-label={t("newsCta")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2c1622] transition-colors hover:bg-brand-rose disabled:opacity-60"
                >
                  <ArrowRight className="size-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{t("rights")}</p>
          <div className="flex gap-2">
            {["COD", "VNĐ"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
