import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { monogram } from "@/lib/art";
import { useCart } from "@/lib/cart";
import type { Category } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ReviewSection } from "@/components/store/ReviewSection";
import { Eye, Heart, Star, X } from "lucide-react";
import { ProductGallery } from "@/components/store/ProductGallery";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export type StoreProduct = {
  _id: Id<"products">;
  nameVi: string;
  nameEn: string;
  category: Category;
  price: number;
  sizes: string[];
  inStock: boolean;
  /** Seller-only detail fields; null when not set. */
  description: string | null;
  stock: number | null;
  image: string | null;
  /** Extra gallery photos (resolved URLs), in order. */
  images?: string[];
  /** Storage ids, parallel to `images`. Seller editor only. */
  imageIds?: string[];
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
  const { add, items } = useCart();
  // Reviews are per-product; `undefined` while the query is in flight.
  const reviewable = useQuery(api.reviews.summary, {
    productId: product._id,
  });
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [wished, setWished] = useState(
    () => readWishlist().includes(product._id),
  );
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  // Size picked inside the modal, kept separate from the inline chips.
  const [modalSize, setModalSize] = useState<string | null>(null);

  const name = lang === "vi" ? product.nameVi : product.nameEn;
  const size =
    selectedSize && product.sizes.includes(selectedSize)
      ? selectedSize
      : (product.sizes[0] ?? "Free Size");

  // How many of this product are already in the cart (all sizes combined).
  const inCartQty = items
    .filter((item) => item.productId === product._id)
    .reduce((sum, item) => sum + item.qty, 0);

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

  const modalSelectedSize =
    modalSize && product.sizes.includes(modalSize)
      ? modalSize
      : (product.sizes[0] ?? "Free Size");

  const handleModalAdd = () => {
    add(product, modalSelectedSize);
    toast.success(t("addedToast"), {
      description: `${name} · ${modalSelectedSize}`,
    });
    setQuickViewOpen(false);
  };

  return (
    <>
      <article className="card-lift group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {/* The photo itself is the quick-view trigger.
          //
          // It used to be reachable only through the hover-revealed button,
          // which is `hidden md:flex` — on a phone that button does not exist,
          // so a mobile shopper had NO way to open the detail modal at all. This
          // overlay makes the whole image tappable on every device, and carries
          // role/tabIndex/onKeyDown so it is reachable by keyboard too.
          //
          // It sits UNDER the wishlist and quick-view buttons (z-0 vs z-10), and
          // those stop propagation, so tapping them never also opens the modal. */}
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          {product.image || product.images?.length ? (
            <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
              <ProductGallery
                images={[product.image, ...(product.images ?? [])]}
                alt={name}
                showThumbs={false}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center font-display text-5xl font-bold text-muted-foreground/50">
              {monogram(name)}
            </div>
          )}

          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label={`${t("quickView")}: ${name}`}
            className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
          />

          <button
            type="button"
            onClick={(event) => {
              // The image overlay underneath is the quick-view trigger; without
              // this, favouriting would also open the modal.
              event.stopPropagation();
              toggleWishlist();
            }}
            aria-label={wished ? t("wishlistRemove") : t("wishlistAdd")}
            aria-pressed={wished}
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 shadow-soft transition-colors hover:bg-white"
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                wished ? "fill-brand-rose text-brand-ink" : "text-foreground",
              )}
            />
          </button>

          {/* Inline "in cart" indicator — Amazon/Flipkart style, mirrors the header badge. */}
          {inCartQty > 0 && (
            <span className="pointer-events-none absolute left-3 top-3 z-10 flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-accent px-2 text-[11px] font-bold text-accent-foreground shadow-soft">
              {inCartQty}
              <span className="hidden sm:inline">{t("inCartBadge")}</span>
            </span>
          )}

          {/* Quick view trigger — pointer devices only, so mobile keeps the tap target. */}
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label={`${t("quickView")}: ${name}`}
            className="absolute inset-x-3 bottom-3 z-10 hidden items-center justify-center gap-2 rounded-full bg-foreground/85 px-4 py-2.5 text-xs font-semibold text-background opacity-0 backdrop-blur transition-opacity duration-200 hover:bg-foreground focus-visible:opacity-100 group-hover:opacity-100 md:flex"
          >
            <Eye className="size-4" />
            {t("quickView")}
          </button>

          {!product.inStock && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 rounded-full bg-foreground/85 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-background">
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

      <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        {/* Mobile-first sizing: the dialog is `fixed top-1/2 translate-y-[-50%]`,
            so on a short screen (landscape phone, small browser chrome) a 90vh
            panel plus its offset overflows the viewport and the bottom half —
            the add-to-cart controls — becomes unreachable. Capping at 85dvh and
            letting the inner column scroll keeps every control reachable.
            `dvh` tracks the dynamic viewport, so the mobile browser URL bar
            collapsing no longer crops the panel. */}
        <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain p-0 sm:max-h-[90vh] sm:max-w-2xl">
          <DialogTitle className="sr-only">{t("quickView")}</DialogTitle>
          <DialogDescription className="sr-only">
            {name}
          </DialogDescription>
          <DialogClose asChild>
            <button
              type="button"
              aria-label={t("quickViewClose")}
              // 44px on touch, 36px on pointer devices. The close button is the
              // way out of this dialog, so a 36px target is a real usability
              // problem on a phone.
              className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-background/80 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-background sm:right-4 sm:top-4 sm:size-9"
            >
              <X className="size-4" />
            </button>
          </DialogClose>

          {/* `min-h-0` lets this grid actually shrink inside the scrollable
              dialog. Without it a grid item defaults to `min-height: auto`,
              so the detail column refuses to compress and overflows past the
              dialog's 85dvh cap instead of scrolling.
              On mobile the photo is a short fixed band rather than a 4:5 block:
              at 45dvh it consumed most of the dialog and pushed the price,
              the description AND the add-to-cart button below the fold, so a
              phone shopper saw the photo and nothing else. Desktop keeps the
              side-by-side layout where the photo does not steal vertical space
              from the copy. */}
          <div className="grid min-h-0 gap-0 sm:grid-cols-2">
            <div className="relative h-[38dvh] overflow-hidden bg-secondary sm:h-auto sm:aspect-auto sm:max-h-none sm:min-h-full">
              {product.image || product.images?.length ? (
                <ProductGallery
                  images={[product.image, ...(product.images ?? [])]}
                  alt={name}
                  /* `contain`, not `cover`: this is the one surface where the
                     shopper needs to see the WHOLE garment. Cover-cropping a
                     tall product photo inside a short phone frame sliced it in
                     half, hiding exactly the detail that sells the item. */
                  fit="contain"
                />
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center font-display text-5xl font-bold text-muted-foreground/50">
                  {monogram(name)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {categoryLabel(product.category)}
                </p>
                <h2 className="mt-2 font-display text-xl font-bold leading-snug">
                  {name}
                </h2>
              </div>

              <p className="text-lg font-semibold tabular-nums">
                {formatVnd(product.price)}
              </p>

              {/* Description.
                  *
                  * `description` is optional in the schema, so a product added
                  * without one would otherwise leave a silent gap under the
                  * price and read as a broken page. We fall back to copy that
                  * describes the shop's own guarantees rather than inventing
                  * product claims — a placeholder that promises something we
                  * have not verified is worse than an honest generic line.
                  *
                  * Whitespace-only is treated as missing so a stray newline from
                  * the seller's form does not defeat the fallback. */}
              {(() => {
                const text = (product.description ?? "").trim();
                if (!text) {
                  return (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("productNoDescription")}
                    </p>
                  );
                }
                // `whitespace-pre-line` keeps the seller's own line breaks, and
                // `break-words` stops one long unbroken string from widening the
                // modal on a narrow phone screen.
                return (
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                    {text}
                  </p>
                );
              })()}

              {rating !== undefined && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        i < Math.round(rating)
                          ? "fill-brand-rose text-brand-rose"
                          : "fill-border text-border",
                      )}
                    />
                  ))}
                  <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}

              {product.sizes.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {t("sizeLabel")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setModalSize(s)}
                        aria-pressed={modalSelectedSize === s}
                        className={cn(
                          "min-w-10 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          modalSelectedSize === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-ring hover:text-foreground",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {inCartQty > 0 && (
                <p className="text-xs text-muted-foreground">
                  {inCartQty} {t("inCartBadge")}
                </p>
              )}

              <button
                type="button"
                onClick={handleModalAdd}
                disabled={!product.inStock}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {product.inStock ? t("addToCart") : t("soldOut")}
              </button>

              {/* Reviews live inside the quick view: it is the only product
                  detail surface, and it is already a scrollable panel. */}
              {reviewable === undefined ? null : (
                <ReviewSection
                  productId={product._id}
                  canReview={false}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
