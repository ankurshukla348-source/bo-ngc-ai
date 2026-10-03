import { Header } from "@/components/store/Header";
import { ProductCard, type StoreProduct } from "@/components/store/ProductCard";
import { useCart } from "@/lib/cart";
import { StoreFooter } from "@/components/store/StoreFooter";

import { api } from "@/convex/_generated/api";
import { CATEGORIES, type Category } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Headphones,
  Play,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Warm tints used when a category/card has no product photo yet. */
const TINTS = [
  "#f4f0ff",
  "#efe9fe",
  "#eae2fd",
  "#e5dcfc",
  "#e0d5fb",
  "#dbcef9",
];

const HERO_TRUST = [
  { icon: Truck, titleKey: "trustShip", subKey: "trustShipSub" },
  { icon: RotateCcw, titleKey: "trustReturns", subKey: "trustReturnsSub" },
  { icon: ShieldCheck, titleKey: "trustPay", subKey: "trustPaySub" },
] as const;

const TRUST_STRIP = [
  { icon: Truck, titleKey: "trustShip", subKey: "trustShipSub" },
  { icon: RotateCcw, titleKey: "trustReturns", subKey: "trustReturnsSub" },
  { icon: ShieldCheck, titleKey: "trustPay", subKey: "trustPaySub" },
  { icon: Headphones, titleKey: "trustSupport", subKey: "trustSupportSub" },
] as const;

const STYLE_CARDS: { category: Category; tintIndex: number }[] = [
  { category: "dresses", tintIndex: 0 },
  { category: "tops", tintIndex: 1 },
  { category: "cardigans", tintIndex: 2 },
  { category: "trousers", tintIndex: 3 },
];

/** "bestsellers" is represented by the black SALE circle instead, so it is
 *  left out of the pill bar. */
const CIRCLE_CATEGORIES = [
  "all",
  ...CATEGORIES.filter((c) => c !== "bestsellers"),
] as const;

/** Stable pseudo-rating per product id (deterministic across renders). */
function ratingFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return 4.6 + ((hash >>> 0) % 4) / 10; // 4.6 – 4.9
}

export default function Landing() {
  const { t, lang, categoryLabel } = useI18n();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Category | "all">("all");
  const [slide, setSlide] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const products = useQuery(api.products.list);
  const seedIfEmpty = useMutation(api.products.seedIfEmpty);

  // One-time store initialization. The backend `seeded` marker guarantees
  // this runs at most once per deployment — deleted products stay deleted
  // and admin edits persist across reloads.
  useEffect(() => {
    if (products === undefined) return;
    void seedIfEmpty();
  }, [products, seedIfEmpty]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", products?.length ?? 0);
    for (const p of products ?? []) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const { add } = useCart();

  const quickAdd = (product: StoreProduct, size: string) => {
    add(product, size);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      const matchesCategory = active === "all" || p.category === active;
      const matchesSearch =
        !q ||
        p.nameVi.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, active, search]);

  // Hero slides: up to three product photos. Keys use the stable product id
  // (NOT the image URL — Convex storage URLs rotate on every query re-run,
  // which would remount the images and can destabilize the DOM commit).
  const heroImages = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.image)
        .slice(0, 3)
        .map((p) => ({
          id: p._id,
          src: p.image as string,
          alt: lang === "vi" ? p.nameVi : p.nameEn,
        })),
    [products, lang],
  );
  const activeSlide = Math.min(slide, Math.max(heroImages.length, 1) - 1);

  const scrollToShop = () =>
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  // Mockup entry points reset any previous filter/search, then dive into the grid.
  const applyCategory = (category: Category | "all") => {
    setActive(category);
    setSearch("");
    scrollToShop();
  };

  const firstImageIn = (category: Category) =>
    (products ?? []).find((p) => p.category === category && p.image)?.image ??
    null;

  const newsImage = firstImageIn("bestsellers");

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  // While a search is active the page shows ONLY matching products —
  // hero, categories, banners, story, trust and newsletter are hidden.
  const searching = search.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header query={search} onQueryChange={setSearch} showNav />

      {searching ? (
        <SearchResults
          products={products}
          filtered={filtered}
          query={search}
          onClear={() => setSearch("")}
        />
      ) : (
        <>
          {/* ── Hero ─────────────────────────────────────────── */}
          <section className="relative">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          {/* Copy */}
          <div className="flex flex-col justify-center gap-6 px-4 py-12 sm:px-8 lg:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              {t("heroEyebrow")}
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
              {t("heroTagline")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={scrollToShop}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
              >
                {t("ctaShop")}
                <ArrowRight className="size-4" />
              </button>
              <a
                href="#story"
                className="inline-flex items-center gap-3 text-sm font-semibold"
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-soft transition-transform hover:scale-105">
                  <Play className="ml-0.5 size-4 fill-foreground" />
                </span>
                {t("ctaLookbook")}
              </a>
            </div>

            {/* Inline trust row */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
              {HERO_TRUST.map(({ icon: Icon, titleKey, subKey }) => (
                <div key={titleKey} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Icon className="size-4 text-brand-rose" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">
                      {t(titleKey)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(subKey)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual — the fallback layer stays mounted so the commit when
              products load is append-only (fixes insertBefore crashes). */}
          <div className="relative min-h-[420px] overflow-hidden bg-secondary sm:min-h-[520px] md:min-h-full">
            {/* Real product photo fallback so the hero is never blank */}
            <img
              src="https://images.pexels.com/photos/4314754/pexels-photo-4314754.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            {heroImages.map((img, i) => (
              <img
                key={img.id}
                src={img.src}
                alt={img.alt}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                  i === activeSlide ? "opacity-100" : "opacity-0",
                )}
              />
            ))}

            {/* Slide pager */}
            {heroImages.length > 1 && (
              <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlide(i)}
                    aria-label={`${t("slideLabel")} ${i + 1}`}
                    className={cn(
                      "text-[11px] font-semibold tracking-widest transition-colors",
                      i === activeSlide
                        ? "text-foreground"
                        : "text-foreground/40 hover:text-foreground/70",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </button>
                ))}
                <span className="my-1 h-10 w-px bg-foreground/20" />
              </div>
            )}
          </div>
        </div>

        {/* Overlapping circular category bar */}
        <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-8">
          <div className="flex justify-start gap-6 overflow-x-auto rounded-3xl border border-border bg-card px-6 py-6 shadow-soft-lg sm:justify-center sm:gap-8">
            {CIRCLE_CATEGORIES.map((category, i) => {
              const isActive = active === category && !search;
              const label =
                category === "all"
                  ? t("allCategories")
                  : categoryLabel(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => applyCategory(category)}
                  aria-pressed={isActive}
                  className="group flex w-16 shrink-0 flex-col items-center gap-2.5"
                >
                  <span
                    style={
                      category === "all"
                        ? undefined
                        : { background: TINTS[(i - 1) % TINTS.length] }
                    }
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-full font-display text-xl font-bold transition-all duration-200 group-hover:-translate-y-1",
                      category === "all"
                        ? "border border-border bg-secondary text-foreground"
                        : "text-foreground/80",
                      isActive &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-card",
                    )}
                  >
                    {label.charAt(0)}
                  </span>
                  <span className="text-center text-[11px] font-medium text-foreground/80">
                    {label}
                  </span>
                </button>
              );
            })}
            {/* Black SALE circle, mockup-style */}
            <button
              type="button"
              onClick={() => applyCategory("bestsellers")}
              aria-pressed={active === "bestsellers" && !search}
              className="group flex w-16 shrink-0 flex-col items-center gap-2.5"
            >
              <span
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground transition-transform duration-200 group-hover:-translate-y-1",
                  active === "bestsellers" &&
                    !search &&
                    "ring-2 ring-ring ring-offset-2 ring-offset-card",
                )}
              >
                %
              </span>
              <span className="text-center text-[11px] font-medium text-foreground/80">
                {t("circleSale")}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Find your perfect style ──────────────────────────── */}
      <section id="categories" className="scroll-mt-36">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {t("shopEyebrow")}
              </p>
              <h2 className="mt-2 max-w-xs font-display text-4xl font-bold leading-tight tracking-tight sm:text-[2.6rem]">
                {t("shopTitle")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => applyCategory("all")}
              className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t("viewAllCategories")}
              <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STYLE_CARDS.map(({ category, tintIndex }) => {
              const img = firstImageIn(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => applyCategory(category)}
                  className="card-lift group relative block aspect-[4/5] overflow-hidden rounded-3xl border border-border text-left shadow-soft"
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      style={{ background: TINTS[tintIndex] }}
                      className="absolute inset-0"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <span className="absolute inset-x-5 bottom-5">
                    <span className="block font-display text-xl font-bold text-white">
                      {categoryLabel(category)}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-white/85">
                      {t("exploreNow")}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sale banners ─────────────────────────────────────── */}
      <section>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-6 sm:px-8 lg:grid-cols-2">
          {(
            [
              {
                eyebrowKey: "banner1Eyebrow",
                titleKey: "banner1Tag",
                subKey: "banner1Title",
                ctaKey: "shopTheSale",
                target: "dresses" as const,
                imgCategory: "dresses" as const,
              },
              {
                eyebrowKey: "banner2Eyebrow",
                titleKey: "banner2Tag",
                subKey: "banner2Title",
                ctaKey: "exploreNewIn",
                target: "cardigans" as const,
                imgCategory: "cardigans" as const,
              },
            ] as const
          ).map((banner) => {
            const img = firstImageIn(banner.imgCategory);
            return (
              <div
                key={banner.eyebrowKey}
                className="relative grid overflow-hidden rounded-3xl border border-border bg-secondary shadow-soft sm:grid-cols-[1.2fr_1fr]"
              >
                <div className="flex flex-col items-start justify-center gap-3 p-7 sm:p-10">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    {t(banner.eyebrowKey)}
                  </span>
                  <h3 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                    {t(banner.titleKey)}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t(banner.subKey)}
                  </p>
                  <button
                    type="button"
                    onClick={() => applyCategory(banner.target)}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    {t(banner.ctaKey)}
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="relative min-h-[160px]">
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#f3eeff] to-brand-rose/45" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Most loved picks ─────────────────────────────────── */}
      <section id="shop" className="scroll-mt-36">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {t("picksEyebrow")}
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">
                {t("picksTitle")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => applyCategory("all")}
              className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t("viewAllProducts")}
              <ArrowRight className="size-4" />
            </button>
          </div>

          {(active !== "all" || search) && (
            <p className="mt-4 text-sm text-muted-foreground">
              {active === "all" ? `“${search}”` : categoryLabel(active)} ·{" "}
              {filtered.length} {t("productsUnit")}
              <button
                type="button"
                onClick={() => {
                  setActive("all");
                  setSearch("");
                }}
                className="ml-3 font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {t("clearFilters")}
              </button>
            </p>
          )}

          {products === undefined ? (
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-3xl bg-secondary"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
              <p className="font-display text-2xl font-bold">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("emptyBody")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActive("all");
                  setSearch("");
                }}
                className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                {t("clearFilters")}
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {filtered.slice(0, 8).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product as StoreProduct}
                  rating={ratingFor(product._id)}
                  onQuickAdd={() => quickAdd(product, product.sizes[0] ?? "Free Size")}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────── */}
      <section id="story" className="scroll-mt-36">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {t("storyEyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-snug tracking-tight sm:text-4xl">
            “{t("storyTitle")}”
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("storyP1")}
          </p>
          <p className="mt-4 font-display text-lg font-semibold italic">
            — Bảo Ngọc · {t("storyBrand")}
          </p>
          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-4">
            {[
              { value: "5000+", labelKey: "statCustomers" as const },
              { value: "4,9/5", labelKey: "statRating" as const },
              { value: "1h", labelKey: "statDispatch" as const },
            ].map((stat) => (
              <div
                key={stat.labelKey}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <p className="font-display text-2xl font-bold">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t(stat.labelKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 gap-6 rounded-3xl border border-border bg-card px-6 py-8 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_STRIP.map(({ icon: Icon, titleKey, subKey }) => (
              <div key={titleKey} className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Icon className="size-5 text-brand-rose" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {t(titleKey)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(subKey)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16">
          <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft lg:grid-cols-[1fr_1.4fr]">
            <div className="relative min-h-[220px]">
              {newsImage ? (
                <img
                  src={newsImage}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#f3eeff] to-brand-rose/40" />
              )}
            </div>
            <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-ink">
                {t("newsOffer")}
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("newsTitle")}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {t("newsBody")}
              </p>
              {subscribed ? (
                <p className="mt-2 w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
                  {t("newsThanks")}
                </p>
              ) : (
                <form
                  onSubmit={subscribe}
                  className="mt-2 flex max-w-md items-center gap-2 rounded-full border border-border bg-background p-1.5 pl-5"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("newsPlaceholder")}
                    aria-label={t("newsPlaceholder")}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-foreground"
                  >
                    {t("newsCta")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

        </>
      )}

      <StoreFooter
        onCategorySelect={(category) => applyCategory(category)}
      />
    </div>
  );
}

/** Clean search-results view: ONLY matching products — no hero, banners,
 *  categories, story or newsletter until the search is cleared. */
function SearchResults({
  products,
  filtered,
  query,
  onClear,
}: {
  products: ReturnType<typeof useQuery<typeof api.products.list>>;
  filtered: NonNullable<ReturnType<typeof useQuery<typeof api.products.list>>>;
  query: string;
  onClear: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {t("searchResultsTitle")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            “{query.trim()}”
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {filtered.length} {t("productsUnit")}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            {t("clearSearch")}
          </button>
        </div>
      </div>

      {products === undefined ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-3xl bg-secondary"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
          <p className="font-display text-2xl font-bold">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("emptyBody")}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            {t("clearSearch")}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product._id}
              product={product as StoreProduct}
              rating={ratingFor(product._id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
