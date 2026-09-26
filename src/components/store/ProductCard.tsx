import type { Id } from "@/convex/_generated/dataModel";
import { monogram } from "@/lib/art";
import { useCart } from "@/lib/cart";
import type { Category } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heart, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type StoreProduct = {
  _id: Id<"products">;
  nameVi: string;
  nameEn: string;
  category: Category;
  price: number;
  sizes: string[];
  inStock: boolean;
  image: string | null;
};

const WISHLIST_KEY = "mama-wishlist-v1";

function readWishlist(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids: string[]) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function ProductCard({
  product,
  rating,
  onQuickAdd,
}: {
  product: StoreProduct;
  /** Optional fixed rating (e.g. 4.8) shown as a star chip, mockup-style. */
  rating?: number;
  /** Skip the size picker and open the checkout directly (landing picks). */
  onQuickAdd?: () => void;
}) {
  const { t, lang, categoryLabel } = useI18n();
  const { add } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [wished, setWished] = useState(
    () => readWishlist().includes(product._id),
  );

  const name = lang === "vi" ? product.nameVi : product.nameEn;
  const size =
    selectedSize && product.sizes.includes(selectedSize)
      ? selectedSize
      : (product.sizes[0] ?? "Free Size");

  const toggleWishlist = () => {
    const ids = readWishlist();
    const next = wished
      ? ids.filter((id) => id !== product._id)
      : [...ids, product._id];
    writeWishlist(next);
    setWished(!wished);
  };

  const handleAdd = () => {
    add(product, size);
    toast.success(t("addedToast"), {
      description: `${name} · ${size}`,
    });
  };

  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        {product.image ? (
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl font-bold text-muted-foreground/50">
            {monogram(name)}
          </div>
        )}

        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wished ? t("wishlistRemove") : t("wishlistAdd")}
          aria-pressed={wished}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/90 shadow-soft transition-colors hover:bg-white"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              wished ? "fill-brand-rose text-brand-rose" : "text-foreground",
            )}
          />
        </button>

        {!product.inStock && (
          <div className="absolute inset-x-3 bottom-3 rounded-full bg-foreground/85 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-background">
            {t("soldOut")}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug sm:text-[15px]">
            {name}
          </h3>
          {rating !== undefined && (
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3",
                    i < Math.round(rating)
                      ? "fill-brand-rose text-brand-rose"
                      : "fill-border text-border",
                  )}
                />
              ))}
              <span className="ml-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="text-base font-semibold tabular-nums">
            {formatVnd(product.price)}
          </p>

          {product.inStock &&
            (onQuickAdd ? (
              <button
                type="button"
                onClick={onQuickAdd}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-foreground"
              >
                {t("addToCart")}
              </button>
            ) : product.sizes.length > 1 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {product.sizes.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    aria-pressed={size === s}
                    title={`${t("sizeLabel")}: ${s}`}
                    className={cn(
                      "min-w-7 rounded-full border px-1.5 py-1 text-[11px] font-semibold transition-colors",
                      size === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-foreground"
              >
                {t("addToCart")}
              </button>
            ))}
        </div>
      </div>
    </article>
  );
}
