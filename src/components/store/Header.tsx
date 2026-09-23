import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Search, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

const NAV_LINKS = [
  { href: "#shop", key: "navShop" },
  { href: "#categories", key: "navCategories" },
  { href: "#story", key: "navStory" },
  { href: "#contact", key: "navContact" },
] as const;

/**
 * Site header. `showNav`/search are toggled by the landing page — on
 * /checkout and /admin the anchors would point at sections that don't exist.
 */
export function Header({
  query,
  onQueryChange,
  showNav = false,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  showNav?: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const { count } = useCart();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const searchInput = (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query ?? ""}
        onChange={(e) => onQueryChange?.(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="h-10 w-full border-2 border-black bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-background"
      />
    </div>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="border-b-2 border-black bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]">
            {t("announce")}
          </p>
          <Link
            to="/admin"
            className="hidden shrink-0 items-center gap-1.5 border-2 border-primary-foreground/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-primary-foreground hover:text-primary sm:flex"
          >
            <Store className="size-3" />
            {t("seller")}
          </Link>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b-2 border-black bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="flex size-9 items-center justify-center border-2 border-black bg-primary font-display text-lg font-bold text-primary-foreground sm:size-10 sm:text-xl">
              M
            </span>
            <span className="leading-none">
              <span className="block font-display text-base font-bold tracking-tight sm:text-xl">
                MAMA &amp; CO.
              </span>
              <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:block">
                Shop Bảo Ngọc
              </span>
            </span>
          </Link>

          {showNav && (
            <nav className="ml-4 hidden items-center gap-6 lg:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold uppercase tracking-wide underline-offset-4 transition-colors hover:underline"
                >
                  {t(link.key)}
                </a>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {showNav && (
              <div className="relative hidden w-44 md:block lg:w-56">
                {searchInput}
              </div>
            )}

            {showNav && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label={t("searchLabel")}
                className="flex size-10 items-center justify-center border-2 border-black bg-card transition-colors hover:bg-[#e7e0d2] md:hidden"
              >
                <Search className="size-4" />
              </button>
            )}

            {/* Language toggle */}
            <div className="flex border-2 border-black">
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={cn(
                    "px-2 py-1.5 text-[11px] font-bold uppercase transition-colors",
                    lang === code
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-card",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Cart */}
            <Link
              to="/checkout"
              aria-label={t("cartLabel")}
              className="relative flex size-10 items-center justify-center border-2 border-black bg-card nb-shadow-sm nb-press"
            >
              <ShoppingBag className="size-4" />
              {count > 0 && (
                <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center border-2 border-black bg-[#e4552e] px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search row */}
        {showNav && mobileSearchOpen && (
          <div className="border-t-2 border-black px-4 py-3 md:hidden">
            {searchInput}
          </div>
        )}

        {/* Mobile nav chips */}
        {showNav && (
          <div className="flex gap-2 overflow-x-auto border-t-2 border-black px-4 py-2 lg:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 border-2 border-black bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
              >
                {t(link.key)}
              </a>
            ))}
            <Link
              to="/admin"
              className="shrink-0 border-2 border-black bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground"
            >
              {t("seller")}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
