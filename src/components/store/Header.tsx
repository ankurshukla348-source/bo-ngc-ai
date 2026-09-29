import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { TEXT } from "@/constants/text";
import {
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

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
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const searchInput = (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query ?? ""}
        onChange={(e) => onQueryChange?.(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="h-10 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
      />
    </div>
  );

  const accountButton = (
    <div className="relative" ref={accountRef}>
      <button
        type="button"
        onClick={() => setAccountOpen((v) => !v)}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
      >
        <UserRound className="size-[18px]" />
        <ChevronDown className="-ml-1 size-3 text-muted-foreground" />
      </button>

      {accountOpen && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-soft-lg"
        >
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Heart className="size-4 text-muted-foreground" />
                {t("myAccount")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                <LogOut className="size-4" />
                {t("signOutLabel")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  navigate("/auth");
                }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <LogIn className="size-4 text-muted-foreground" />
                {t("signIn")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] sm:text-[11px]">
            {t("announce")}
          </p>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:gap-6">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {/* Mobile: short brand so the bar stays on one line; Desktop: full */}
            <span className="font-display text-lg font-bold leading-tight tracking-[0.04em] md:hidden">
              {TEXT.brandMobile}
            </span>
            <span className="hidden font-display text-xl font-bold leading-tight tracking-[0.08em] md:block lg:text-2xl">
              {TEXT.brandFull}
            </span>
          </Link>

          {showNav && (
            <nav className="ml-2 hidden items-center gap-7 lg:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  {t(link.key)}
                </a>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {showNav && (
              <div className="relative hidden w-44 md:block lg:w-60">
                {searchInput}
              </div>
            )}

            {showNav && (
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label={t("searchLabel")}
                className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-secondary md:hidden"
              >
                <Search className="size-[18px]" />
              </button>
            )}

            {/* Language toggle */}
            <div className="flex rounded-full border border-input p-0.5">
              {(["vi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
                    lang === code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>

            {accountButton}

            {/* Cart */}
            <Link
              to="/checkout"
              aria-label={t("cartLabel")}
              className="relative flex size-10 items-center justify-center rounded-full transition-colors hover:bg-secondary"
            >
              <ShoppingBag className="size-[18px]" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search row */}
        {showNav && mobileSearchOpen && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            {searchInput}
          </div>
        )}

        {/* Mobile nav chips */}
        {showNav && (
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2.5 lg:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground/80"
              >
                {t(link.key)}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
