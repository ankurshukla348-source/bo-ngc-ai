import { CATEGORIES, type Category } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Facebook, Instagram, Music2, Twitter } from "lucide-react";

/** Dark editorial footer: brand + link columns + newsletter, mockup-style. */
export function StoreFooter({
  onCategorySelect,
}: {
  onCategorySelect?: (category: Category) => void;
}) {
  const { t, categoryLabel } = useI18n();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  const socials = [Instagram, Facebook, Twitter, Music2];

  return (
    <footer
      id="contact"
      className="scroll-mt-32 rounded-t-[2rem] bg-[#3a2030] text-[#fdf2f6]"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <span className="font-display text-2xl font-bold tracking-[0.08em]">

            </span>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              {t("footerTagline")}
            </p>
            <div className="mt-1 flex gap-2">
              {socials.map((Icon, i) => (
                <a
                  key={i}
                  href="#contact"
                  aria-label="social"
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
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
              <li>{t("supportShipping")}</li>
              <li>{t("supportReturns")}</li>
              <li>{t("supportPayment")}</li>
              <li>{t("supportHotline")}</li>
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
                className="mt-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/5 p-1.5 pl-4"
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
                <button
                  type="submit"
                  aria-label={t("newsCta")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2c1622] transition-colors hover:bg-[#e695b9]"
                >
                  <ArrowRight className="size-4" />
                </button>
              </form>
            )}
            <Link
              to="/auth?tab=seller"
              className="mt-5 inline-block text-xs text-white/50 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {t("seller")}
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>{t("rights")}</p>
          <div className="flex gap-2">
            {["VietQR", "COD", "VNĐ"].map((chip) => (
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
