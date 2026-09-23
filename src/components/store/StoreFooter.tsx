import { CATEGORIES, type Category } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { Check, Store } from "lucide-react";
import { Link } from "react-router";

/** Dark flat-color footer: link columns, support info and payment chips. */
export function StoreFooter({
  onCategorySelect,
}: {
  onCategorySelect?: (category: Category) => void;
}) {
  const { t, categoryLabel } = useI18n();

  const supportLines = [
    t("supportShipping"),
    t("supportReturns"),
    t("supportPayment"),
    t("supportHotline"),
  ];

  return (
    <footer id="contact" className="scroll-mt-32 border-t-2 border-black bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center border-2 border-primary-foreground bg-primary-foreground font-display text-xl font-bold text-primary">
              M
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              MAMA &amp; CO.
            </span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
            {t("footerTagline")}
          </p>
        </div>

        {/* Shop */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/60">
            {t("footerShop")}
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href="#shop"
                className="inline-block font-semibold underline-offset-4 hover:underline"
              >
                {t("shopViewAll")}
              </a>
            </li>
            {CATEGORIES.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => onCategorySelect?.(category)}
                  className="text-left text-primary-foreground/80 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
                >
                  {categoryLabel(category)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/60">
            {t("footerSupport")}
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-primary-foreground/80">
            {supportLines.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-primary-foreground/60">
            {t("footerCompany")}
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href="#story"
                className="text-primary-foreground/80 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
              >
                {t("companyStory")}
              </a>
            </li>
            <li>
              <a
                href="#love"
                className="text-primary-foreground/80 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline"
              >
                {t("companyReviews")}
              </a>
            </li>
            <li>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 border-2 border-primary-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-primary-foreground hover:text-primary"
              >
                <Store className="size-3.5" />
                {t("seller")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t-2 border-primary-foreground/25">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-primary-foreground/60">{t("rights")}</p>
          <div className="flex gap-2">
            {["VietQR", "COD", "VNĐ"].map((chip) => (
              <span
                key={chip}
                className="border border-primary-foreground/40 px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
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
