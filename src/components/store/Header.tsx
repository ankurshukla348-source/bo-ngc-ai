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
  MessageCircle,
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
        className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:size-10"
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
          {/* Live chat, not a phone number: the shop answers from its own
              account, and the owner's personal line never reaches the page. */}
          <a
            href="#contact"
            className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-opacity hover:opacity-75 sm:text-[11px]"
          >
            <MessageCircle className="size-3" />
            {t("supportLiveChat")}
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:gap-6">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Mobile: short brand, Desktop: full.
                NO truncation here — an ellipsised shop name looks broken. The
                size steps down instead (14px → 16px → 18px → 24px) so the
                wordmark shrinks to fit rather than losing its ending, and
                `whitespace-nowrap` guarantees it never wraps onto a second line
                and pushes the icon row down. */}
            <span className="whitespace-nowrap font-display text-sm font-semibold leading-tight tracking-[0.02em] min-[380px]:text-base md:text-lg md:font-bold md:tracking-[0.04em] lg:text-xl">
              {TEXT.brandMobile}
            </span>
            <span className="hidden whitespace-nowrap font-display text-lg font-bold leading-tight tracking-[0.06em] md:block lg:text-2xl">
              {TEXT.brandFull}
            </span>
          </Link>            {showNav && (
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
                <Link
                  to="/policy"
                  className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  {t("policyLabel")}
                </Link>
              </nav>
            )}

          {/* `shrink-0` guarantees this cluster keeps its full width and is never the
              thing that gets squeezed — the cart and account controls are the
              one part of the header that must be visible on every device. */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5 md:gap-2">
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
                /* 44px on touch (the iOS/Android minimum), 40px from md up where
                   a mouse makes the difference imperceptible. */
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-secondary md:hidden"
              >
                <Search className="size-[18px]" />
              </button>
            )}

            {/* Language toggle.

                Hidden below `md`: on a phone this pill plus its border was
                roughly 60px of a 360px bar, and it was pure crowding — search,
                account and cart are what a shopper actually reaches for. It is
                not lost: the same control now sits in the mobile nav row
                below, where there is room to make it a proper tap target. */}
            <div className="hidden rounded-full border border-input p-0.5 md:flex">
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
              className="relative flex size-11 items-center justify-center rounded-full transition-colors hover:bg-secondary md:size-10"
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

        {/* Mobile nav row — the phone's "menu".

            This scrollable chip row is where the language toggle moved so it
            stops crowding the icon bar. Here it can be a comfortable tap
            target instead of a 60px sliver, and it sits with the other
            navigation rather than pretending to be a primary action.

            `border-l` separates it from the nav chips without extra padding. */}
        {showNav && (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-border px-4 py-2.5 lg:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground/80"
              >
                {t(link.key)}
              </a>
            ))}
            <Link
              to="/policy"
              className="shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-foreground/80"
            >
              {t("policyLabel")}
            </Link>
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-input p-0.5 pl-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("languageLabel")}
              </span>
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
          </div>
        )}
      </div>
    </header>
  );
}
