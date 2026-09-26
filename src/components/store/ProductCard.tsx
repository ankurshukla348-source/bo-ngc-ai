import type { Id } from "@/convex/_generated/dataModel";
import { monogram } from "@/lib/art";
import { useCart } from "@/lib/cart";
import type { Category } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Heart, Plus, Star } from "lucide-react";
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
}: {
  product: StoreProduct;
  /** Optional fixed rating (e.g. 4.8) shown as a star chip, mockup-style. */
  rating?: number;
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
      description: `${name} · ${sizeLabelShort(size)}`,
    });
  };

  return (
    <article className="group flex flex-col border-2 border-black bg-card nb-shadow transition-transform duration-150 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden border-b-2 border-black bg-[#e7e0d2]">
        {product.image ? (
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl font-bold text-muted-foreground">
            {monogram(name)}
          </div>
        )}

        <span className="absolute left-0 top-0 border-b-2 border-r-2 border-black bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
          {categoryLabel(product.category)}
        </span>

        {rating !== undefined && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 border-2 border-black bg-background px-1.5 py-1 text-[11px] font-bold tabular-nums">
            <Star className="size-3 fill-[#e4552e] text-[#e4552e]" />
            {rating.toFixed(1)}
          </span>
        )}

        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={wished ? t("wishlistRemove") : t("wishlistAdd")}
          aria-pressed={wished}
          className={cn(
            "absolute right-2 top-2 flex size-8 items-center justify-center border-2 border-black transition-colors",
            wished ? "bg-[#e4552e]" : "bg-background hover:bg-[#e4552e]",
          )}
        >
          <Heart
            className={cn(
              "size-4",
              wished ? "fill-white text-white" : "text-foreground",
            )}
          />
        </button>

        {!product.inStock && (
          <div className="absolute inset-x-0 bottom-0 border-t-2 border-black bg-primary px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-primary-foreground">
            {t("soldOut")}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug sm:text-base">
            {name}
          </h3>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatVnd(product.price)}
          </p>
        </div>

        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSize(s)}
                aria-pressed={size === s}
                title={`${t("sizeLabel")}: ${s}`}
                className={cn(
                  "border-2 border-black px-2 py-1 text-[11px] font-bold uppercase transition-colors",
                  size === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-[#e7e0d2]",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={!product.inStock}
          onClick={handleAdd}
          className={cn(
            "mt-auto flex h-10 items-center justify-center gap-2 border-2 border-black text-xs font-bold uppercase tracking-wider sm:text-sm",
            product.inStock
              ? "bg-primary text-primary-foreground nb-shadow-sm nb-press"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {product.inStock ? (
            <>
              <Plus className="size-4" />
              {t("addToCart")}
            </>
          ) : (
            t("soldOut")
          )}
        </button>
      </div>
    </article>
  );
}

function sizeLabelShort(size: string) {
  return size;
}
