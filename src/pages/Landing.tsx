import { Header } from "@/components/store/Header";
import { ProductCard, type StoreProduct } from "@/components/store/ProductCard";
import { StoreFooter } from "@/components/store/StoreFooter";
import { api } from "@/convex/_generated/api";
import { CATEGORIES, type Category } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const VALUE_PROPS = [
  { icon: Sparkles, titleKey: "vp1Title", subKey: "vp1Sub" },
  { icon: RotateCcw, titleKey: "vp2Title", subKey: "vp2Sub" },
  { icon: ShieldCheck, titleKey: "vp3Title", subKey: "vp3Sub" },
] as const;

const TESTIMONIALS = [
  { quoteKey: "quote1", nameKey: "quote1Name", cityKey: "quote1City" },
  { quoteKey: "quote2", nameKey: "quote2Name", cityKey: "quote2City" },
  { quoteKey: "quote3", nameKey: "quote3Name", cityKey: "quote3City" },
] as const;

export default function Landing() {
  const { t, lang, categoryLabel } = useI18n();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Category | "all">("all");

  const products = useQuery(api.products.list);
  const seedIfEmpty = useMutation(api.products.seedIfEmpty);

  // First-run: populate the empty catalogue with starter products.
  useEffect(() => {
    if (products && products.length === 0) {
      void seedIfEmpty();
    }
  }, [products, seedIfEmpty]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", products?.length ?? 0);
    for (const p of products ?? []) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

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

  const scrollToShop = () =>
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  const selectCategory = (category: Category | "all") => {
    setActive(category);
    scrollToShop();
  };

  const heroTagName = lang === "vi" ? "Đầm xòe hoa nhí" : "Floral Midi Dress";

  return (
    <div className="min-h-screen bg-background">
      <Header query={search} onQueryChange={setSearch} showNav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-black">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          <div className="flex flex-col justify-center gap-6 border-b-2 border-black px-4 py-12 sm:px-8 md:border-b-0 md:border-r-2 lg:py-20">
            <span className="inline-flex w-fit border-2 border-black bg-[#e4552e] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white nb-shadow-sm">
              {t("heroEyebrow")}
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {t("heroBody")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToShop}
                className="inline-flex items-center gap-2 border-2 border-black bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground nb-shadow nb-press"
              >
                {t("ctaShop")}
                <ArrowRight className="size-4" />
              </button>
              <a
                href="#story"
                className="inline-flex items-center gap-2 border-2 border-black bg-card px-6 py-3.5 text-sm font-bold uppercase tracking-wider nb-shadow nb-press"
              >
                <span className="flex size-5 items-center justify-center border-2 border-black bg-background">
                  <Play className="size-2.5" />
                </span>
                {t("ctaLookbook")}
              </a>
            </div>
          </div>

          {/* Flat geometric collage */}
          <div className="relative min-h-[380px] overflow-hidden bg-[#e7e0d2] sm:min-h-[460px] md:min-h-full">
            <div className="absolute right-0 top-0 h-[58%] w-[72%] bg-[#e4552e]" />
            <div className="absolute bottom-0 left-0 h-[42%] w-[58%] border-r-2 border-t-2 border-black bg-primary" />
            <div className="absolute left-[14%] top-[14%] size-32 rotate-45 border-2 border-black bg-background sm:size-44" />
            <div className="absolute left-[8%] top-[42%] h-4 w-4 border-2 border-black bg-[#e4552e]" />
            <div className="absolute right-[16%] top-[12%] flex flex-col gap-2">
              <span className="block h-3 w-24 border-2 border-black bg-background" />
              <span className="block h-3 w-16 border-2 border-black bg-background" />
            </div>
            <div className="absolute bottom-6 right-4 border-2 border-black bg-background px-4 py-3 nb-shadow-sm sm:right-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t("heroTag")}
              </p>
              <p className="mt-1 font-display text-base font-bold sm:text-lg">
                {heroTagName}
              </p>
              <p className="text-sm font-bold tabular-nums">{formatVnd(685000)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y-2 divide-black sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
          {VALUE_PROPS.map(({ icon: Icon, titleKey, subKey }) => (
            <div key={titleKey} className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <span className="flex size-11 shrink-0 items-center justify-center border-2 border-black bg-background">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold uppercase tracking-wide">
                  {t(titleKey)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(subKey)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section id="categories" className="scroll-mt-36 border-b-2 border-black">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {t("shopEyebrow")}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("shopTitle")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => selectCategory("all")}
              className="hidden items-center gap-2 text-sm font-bold uppercase tracking-wide underline-offset-4 hover:underline sm:inline-flex"
            >
              {t("shopViewAll")} <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {(["all", ...CATEGORIES] as const).map((category) => {
              const isActive = active === category;
              const label =
                category === "all" ? t("allCategories") : categoryLabel(category);
              const count = counts.get(category) ?? 0;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex items-center gap-2 border-2 border-black px-4 py-2.5 text-sm font-bold uppercase tracking-wide nb-shadow-sm nb-press",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-[#e7e0d2]",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center border-2 border-current px-1 text-[10px] font-bold",
                      isActive ? "bg-primary-foreground text-primary" : "bg-background text-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Product grid ─────────────────────────────────────── */}
      <section id="shop" className="scroll-mt-36 border-b-2 border-black">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="font-display text-2xl font-bold sm:text-3xl">
              {active === "all" ? t("navShop") : categoryLabel(active)}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              {filtered.length}{" "}
              {filtered.length === 1 ? t("productUnit") : t("productsUnit")}
            </p>
          </div>

          {products === undefined ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse border-2 border-black bg-card"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 border-2 border-black bg-card p-10 text-center nb-shadow">
              <p className="font-display text-2xl font-bold">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("emptyBody")}</p>
              <button
                type="button"
                onClick={() => {
                  setActive("all");
                  setSearch("");
                }}
                className="mt-5 border-2 border-black bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground nb-shadow-sm nb-press"
              >
                {t("clearFilters")}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {filtered.map((product) => (
                <ProductCard key={product._id} product={product as StoreProduct} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────── */}
      <section id="story" className="scroll-mt-36 border-b-2 border-black">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          <div className="flex flex-col justify-between gap-8 border-b-2 border-black bg-[#e4552e] p-6 text-white sm:p-10 md:border-b-0 md:border-r-2">
            <p className="font-display text-3xl font-semibold italic leading-snug sm:text-4xl">
              “{t("storyTitle")}”
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "2.000+", labelKey: "statCustomers" as const },
                { value: "4,9/5", labelKey: "statRating" as const },
                { value: "24h", labelKey: "statDispatch" as const },
              ].map((stat) => (
                <div
                  key={stat.labelKey}
                  className="border-2 border-black bg-background p-3 text-foreground"
                >
                  <p className="font-display text-xl font-bold sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t(stat.labelKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-5 bg-background p-6 sm:p-10 lg:p-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {t("storyEyebrow")}
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("storyTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("storyP1")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("storyP2")}
            </p>
            <p className="font-display text-lg font-bold italic">— Bảo Ngọc</p>
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────── */}
      <section id="love" className="scroll-mt-36 border-b-2 border-black bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("loveEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("loveTitle")}
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure
                key={item.quoteKey}
                className="flex flex-col gap-4 border-2 border-black bg-background p-5 nb-shadow"
              >
                <span className="font-display text-4xl leading-none text-[#e4552e]">
                  “
                </span>
                <blockquote className="font-display text-base italic leading-relaxed">
                  {t(item.quoteKey)}
                </blockquote>
                <figcaption className="mt-auto border-t-2 border-black pt-3">
                  <span className="block text-sm font-bold uppercase tracking-wide">
                    {t(item.nameKey)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(item.cityKey)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/70 sm:text-base">
            {t("ctaBody")}
          </p>
          <button
            type="button"
            onClick={scrollToShop}
            className="inline-flex items-center gap-2 border-2 border-black bg-[#e4552e] px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_#fdfbf7] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#fdfbf7] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            {t("ctaButton")}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      <StoreFooter
        onCategorySelect={(category) => selectCategory(category)}
      />
    </div>
  );
}
