import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { CATEGORIES, SIZE_OPTIONS, type Category } from "@/lib/catalog";
import { ADMIN_EMAIL } from "@/lib/admin";
import { useAuth } from "@/hooks/use-auth";
import { formatVnd, sanitizePriceInput } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { StoreProduct } from "@/components/store/ProductCard";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import {
  normalizeStatus,
  ORDER_STATUSES,
  PAYMENT_LABELS_EN,
  PAYMENT_LABELS_VI,
  type OrderStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConvex, useAction, useMutation, useQuery } from "convex/react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  ImagePlus,
  Loader2,
  MailWarning,
  MessageCircle,
  Pencil,
  Send,
  LogOut,
  Package,
  Star,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────────
   Square stock toggle (neobrutalist replacement for the round switch)
   ──────────────────────────────────────────────────────────────── */

function StockToggle({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className={cn(
        "relative h-7 w-14 shrink-0 rounded-full border border-border transition-colors",
        checked ? "bg-accent" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-5 rounded-full bg-card shadow-soft transition-all duration-150",
          checked ? "left-8" : "left-1",
        )}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   Storage upload — one place, used by both the create and edit flows
   ──────────────────────────────────────────────────────────────── */

/** Must stay in step with MAX_PRODUCT_IMAGES in src/convex/products.ts. */
const MAX_PRODUCT_IMAGES = 10;

async function uploadFile(
  uploadUrl: string,
  file: File,
): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  const data = (await res.json()) as { storageId: Id<"_storage"> };
  return data.storageId;
}

/* ────────────────────────────────────────────────────────────────
   New product form: dropzone + camera capture + fields
   ──────────────────────────────────────────────────────────────── */

function NewProductForm() {
  const { t, lang, categoryLabel } = useI18n();
  const convex = useConvex();

  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState<Category>("tops");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [inStock, setInStock] = useState(true);
  // Multiple photos per product. The first entry is the thumbnail the
  // storefront, cart and order emails all use.
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Every blob URL this form has ever minted. They are revoked when a photo is
  // removed, when the form resets, and on unmount.
  //
  // This deliberately does NOT use a `[previews]` effect: such an effect runs
  // its cleanup with the PREVIOUS array every time previews changes, so adding
  // a second photo revoked the first photo's blob while it was still on
  // screen — the thumbnail went blank as soon as you picked a second file.
  const blobUrls = useRef<string[]>([]);

  const releaseBlobs = (urls: string[]) => {
    for (const url of urls) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    blobUrls.current = blobUrls.current.filter((url) => !urls.includes(url));
  };

  useEffect(() => {
    // Read `blobUrls.current` INSIDE the cleanup, not at effect setup. Capturing
    // it here would snapshot the empty array from mount, and since every add
    // REASSIGNS the ref to a new array, unmount would revoke nothing and leak
    // every blob the seller picked.
    return () => {
      for (const url of blobUrls.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
      blobUrls.current = [];
    };
  }, []);

  const acceptFiles = (list: FileList | null) => {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return;
    if (incoming.some((f) => !f.type.startsWith("image/"))) {
      toast.error(t("uploadFailed"));
      return;
    }
    const room = MAX_PRODUCT_IMAGES - files.length;
    if (room <= 0) {
      toast.error(t("tooManyImages"));
      return;
    }
    const next = incoming.slice(0, room);
    if (incoming.length > room) toast.error(t("tooManyImages"));
    const urls = next.map((f) => URL.createObjectURL(f));
    blobUrls.current = [...blobUrls.current, ...urls];
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...urls]);
  };

  const removeFileAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      if (url) releaseBlobs([url]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveFile = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setPreviews((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const reset = () => {
    setNameVi("");
    setNameEn("");
    setCategory("tops");
    setPrice("");
    setSizes(["S", "M", "L", "XL"]);
    setInStock(true);
    // Release every blob and empty the native file inputs. Clearing the
    // inputs matters: without it the browser keeps the last selection, so
    // re-opening the form and picking the SAME file fires no `change` event
    // and the new product silently goes up with no photo at all.
    releaseBlobs(blobUrls.current);
    setPreviews([]);
    setFiles([]);
    setDescription("");
    setStock("");
    setDragging(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handlePublish = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedVi = nameVi.trim();
    const trimmedEn = nameEn.trim();
    if (!trimmedVi && !trimmedEn) {
      toast.error(t("fillNames"));
      return;
    }
    const priceValue = Number(sanitizePriceInput(price));
    if (!priceValue) {
      toast.error(
        lang === "vi" ? "Nhập giá sản phẩm" : "Enter a product price",
      );
      return;
    }

    setPublishing(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      const imageIds: string[] = [];

      if (files.length > 0) {
        // Uploaded one at a time: a single failed upload must not discard the
        // photos that already succeeded.
        for (const file of files) {
          try {
            const uploadUrl = await convex.mutation(
              api.products.generateUploadUrl,
              {},
            );
            imageIds.push(await uploadFile(uploadUrl, file));
          } catch (error) {
            console.error(error);
            toast.error(t("uploadFailed"));
          }
        }
        if (imageIds.length > 0) {
          imageStorageId = imageIds[0] as Id<"_storage">;
        }
      }

      // No stock photo is ever invented here. Previously a product saved with
      // no photo was given `imageSrc = placeholderArt(...)` — a fixed
      // Pexels lingerie shot (often the black lace bra), stored permanently
      // against the row. A new product with no photo now stays photo-less and
      // renders the storefront's clean tint/monogram fallback, so the seller
      // sees exactly what the customer sees.
      //
      // `images` is sent whenever at least one photo exists, INCLUDING a single
      // one. Sending it only for 2+ left single-photo products with an
      // `imageStorageId` but no `images` array, so `products:list` returned
      // `imageIds: []` — the gallery was unrecoverable and the next edit had
      // to re-upload from scratch.
      await convex.mutation(api.products.add, {
        nameVi: trimmedVi || trimmedEn,
        nameEn: trimmedEn || trimmedVi,
        category,
        price: priceValue,
        sizes,
        inStock,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(stock.trim() ? { stock: Number(stock) } : {}),
        ...(imageStorageId ? { imageStorageId } : {}),
        ...(imageIds.length > 0 ? { images: imageIds } : {}),
      });

      toast.success(t("productPublished"));
      reset();
    } catch (error) {
      console.error(error);
      toast.error(t("uploadFailed"));
    } finally {
      setPublishing(false);
    }
  };

  const fieldClass =
    "h-10 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-ring focus:bg-card";

  return (
    <form
      onSubmit={handlePublish}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
    >
      <div className="border-b border-border bg-primary px-5 py-3.5">
        <h2 className="font-display text-lg font-bold text-primary-foreground">
          {t("newProduct")}
        </h2>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFiles(e.dataTransfer.files);
          }}
          className={cn(
            "relative flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-center transition-colors",
            dragging ? "bg-accent/10" : "bg-background",
          )}
        >
          {previews.length > 0 ? (
            <>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {previews.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative size-20 overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-foreground/80 px-1 py-0.5 text-[9px] font-bold uppercase text-background">
                        {t("mainImageBadge")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFileAt(index)}
                      aria-label={t("cancel")}
                      className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/90"
                    >
                      <X className="size-3" />
                    </button>
                    <div className="absolute left-0.5 top-0.5 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveFile(index, -1)}
                        disabled={index === 0}
                        aria-label="Lên"
                        className="flex size-5 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFile(index, 1)}
                        disabled={index === previews.length - 1}
                        aria-label="Xuống"
                        className="flex size-5 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {previews.length < MAX_PRODUCT_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase transition-colors"
                >
                  {t("addMoreImages")}
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                {previews.length}/{MAX_PRODUCT_IMAGES} · {t("mainImageHint")}
              </p>
            </>
          ) : (
            <>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-card">
                <ImagePlus className="size-5" />
              </span>
              <p className="text-sm font-bold uppercase tracking-wide">
                {t("dropImage")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dropOr")} · {t("imageHint")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase transition-colors"
                >
                  {t("chooseFile")}
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors"
                >
                  <Camera className="size-3.5" />
                  {t("takePhoto")}
                </button>
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              acceptFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              acceptFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Names */}
        <div className="grid gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("nameVi")}
            <input
              value={nameVi}
              onChange={(e) => setNameVi(e.target.value)}
              placeholder="Đầm xòe hoa nhí"
              className={cn("mt-1.5", fieldClass)}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("nameEn")}
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Floral Midi Dress"
              className={cn("mt-1.5", fieldClass)}
            />
          </label>
        </div>

        {/* Category + price */}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("category")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={cn("mt-1.5", fieldClass)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("priceLabel")}
            <input
              value={price}
              onChange={(e) => setPrice(sanitizePriceInput(e.target.value))}
              inputMode="numeric"
              placeholder="450000"
              className={cn("mt-1.5 tabular-nums", fieldClass)}
            />
          </label>
        </div>
        <p className="-mt-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {formatVnd(Number(sanitizePriceInput(price)) || 0)}
        </p>

        {/* Sizes */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sizesLabel")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((s) => {
              const on = sizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setSizes((prev) =>
                      prev.includes(s)
                        ? prev.filter((x) => x !== s)
                        : [...prev, s],
                    )
                  }
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase transition-colors",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("stockLabel")}
          </span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs font-semibold uppercase",
                inStock ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {inStock ? t("inStock") : t("soldOut")}
            </span>
            <StockToggle checked={inStock} onToggle={setInStock} />
          </div>
        </div>

        {/* Units on hand */}
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("stockCountLabel")}
          <input
            value={stock}
            onChange={(e) => setStock(sanitizePriceInput(e.target.value))}
            inputMode="numeric"
            placeholder={t("stockCountPlaceholder")}
            className={cn("mt-1.5 tabular-nums", fieldClass)}
          />
        </label>

        {/* Description */}
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("descriptionLabel")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("descriptionPlaceholder")}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-ring"
          />
        </label>

        <button
          type="submit"
          disabled={publishing}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        >
          {publishing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("publishing")}
            </>
          ) : (
            t("publish")
          )}
        </button>
      </div>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────
   One photo in the gallery editor: preview, remove, reorder.
   ──────────────────────────────────────────────────────────────── */

function ProductThumb({
  src,
  fallback,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  /** Undefined for a stored photo whose blob we could not resolve. */
  src?: string;
  /** Marks the photo that will be used as the listing thumbnail. */
  fallback: boolean;
  onRemove: () => void;
  onMove: (delta: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="relative size-16 overflow-hidden rounded-xl border border-border bg-secondary">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          ?
        </span>
      )}
      {fallback && (
        <span className="absolute bottom-0 left-0 right-0 bg-foreground/80 px-1 py-0.5 text-[9px] font-bold uppercase text-background">
          {t("mainImageBadge")}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("cancel")}
        className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/90"
      >
        <X className="size-3" />
      </button>
      <div className="absolute left-0.5 top-0.5 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={!canMoveUp}
          aria-label="Lên"
          className="flex size-5 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={!canMoveDown}
          aria-label="Xuống"
          className="flex size-5 items-center justify-center rounded-full bg-background/90 disabled:opacity-30"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Product row with inline edit, stock toggle, two-step delete
   ──────────────────────────────────────────────────────────────── */

function ProductRow({ product }: { product: StoreProduct }) {
  const { t, lang, categoryLabel } = useI18n();
  const convex = useConvex();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState({
    nameVi: product.nameVi,
    nameEn: product.nameEn,
    price: String(product.price),
    category: product.category,
    sizes: product.sizes,
    description: product.description ?? "",
    stock: product.stock === null || product.stock === undefined ? "" : String(product.stock),
  });
  const replaceRef = useRef<HTMLInputElement>(null);
  // Gallery being edited: existing storage ids plus any newly picked files.
  // Existing ids stay as strings so a photo the seller does not touch is not
  // re-uploaded (and keeps its URL stable across saves).
  const [keepIds, setKeepIds] = useState<string[]>([]);
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [addPreviews, setAddPreviews] = useState<string[]>([]);

  // Same blob-lifecycle rule as the new-product form: a `[addPreviews]`
  // effect would revoke the PREVIOUS array's URLs on every add, blanking the
  // photos already on screen. Revoke on removal/reset/unmount instead.
  const blobUrls = useRef<string[]>([]);

  const releaseBlobs = (urls: string[]) => {
    for (const url of urls) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    blobUrls.current = blobUrls.current.filter((url) => !urls.includes(url));
  };

  useEffect(() => {
    // Must read the ref inside the cleanup — see the note in NewProductForm.
    return () => {
      for (const url of blobUrls.current) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
      blobUrls.current = [];
    };
  }, []);

  const totalImages = keepIds.length + addFiles.length;

  const clearGalleryEdits = () => {
    releaseBlobs(blobUrls.current);
    setAddPreviews([]);
    setAddFiles([]);
    setKeepIds([]);
    if (replaceRef.current) replaceRef.current.value = "";
  };

  const pickAdditions = (list: FileList | null) => {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return;
    if (incoming.some((f) => !f.type.startsWith("image/"))) {
      toast.error(t("uploadFailed"));
      return;
    }
    const room = MAX_PRODUCT_IMAGES - totalImages;
    if (room <= 0) {
      toast.error(t("tooManyImages"));
      return;
    }
    const next = incoming.slice(0, room);
    if (incoming.length > room) toast.error(t("tooManyImages"));
    const urls = next.map((f) => URL.createObjectURL(f));
    blobUrls.current = [...blobUrls.current, ...urls];
    setAddFiles((prev) => [...prev, ...next]);
    setAddPreviews((prev) => [...prev, ...urls]);
  };

  const openEditor = () => {
    // Seed the gallery from the STORED STORAGE IDs, never from `product.image`.
    // `image` is a resolved URL, and sending a URL back through `images` makes
    // `products:update` call `ctx.storage.getUrl()` on it — which throws, so
    // the photo silently vanished from the gallery on the next save.
    // `products:list` returns `imageIds` (the real ids) alongside `images`
    // precisely for this. Fall back to the gallery for pre-multi-image rows.
    const stored =
      product.imageIds && product.imageIds.length > 0
        ? product.imageIds
        : (product.images ?? []);
    setKeepIds([...stored]);
    setAddFiles([]);
    setAddPreviews([]);
    releaseBlobs(blobUrls.current);
    if (replaceRef.current) replaceRef.current.value = "";
    setEditing(true);
  };

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const save = async () => {
    if (!draft.nameVi.trim() && !draft.nameEn.trim()) {
      toast.error(t("fillNames"));
      return;
    }
    setBusy(true);
    try {
      // Upload any newly picked photos first, then send the whole ordered set.
      // A failed upload leaves the stored photos untouched.
      const uploaded: string[] = [];
      for (const file of addFiles) {
        try {
          const url = await convex.mutation(api.products.generateUploadUrl, {});
          uploaded.push(await uploadFile(url, file));
        } catch (error) {
          console.error(error);
          toast.error(t("uploadFailed"));
        }
      }

      const gallery = [...keepIds, ...uploaded].slice(0, MAX_PRODUCT_IMAGES);
      const primary = gallery[0] as Id<"_storage"> | undefined;

      await convex.mutation(api.products.update, {
        id: product._id,
        nameVi: draft.nameVi,
        nameEn: draft.nameEn,
        category: draft.category,
        price: Number(sanitizePriceInput(draft.price)) || 0,
        sizes: draft.sizes.length ? draft.sizes : product.sizes,
        description: draft.description,
        ...(draft.stock.trim() ? { stock: Number(draft.stock) } : {}),
        ...(gallery.length ? { images: gallery } : {}),
        ...(primary ? { imageStorageId: primary } : {}),
      });
      setEditing(false);
      clearGalleryEdits();
      toast.success(t("productUpdated"));
    } catch (error) {
      console.error(error);
      toast.error(t("fillNames"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await convex.mutation(api.products.remove, { id: product._id });
      toast.success(t("productDeleted"));
    } catch (error) {
      // Deleted from another tab, or the session expired mid-click.
      console.error(error);
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:bg-card";
  const name = lang === "vi" ? product.nameVi : product.nameEn;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 sm:flex-row sm:items-start">
      {/* Thumb */}
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
        {product.image ? (
          <img
            src={product.image}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-xl font-bold text-muted-foreground">
            ?
          </div>
        )}
      </div>

      {/* Info / edit fields */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="grid gap-2">
            <input
              value={draft.nameVi}
              onChange={(e) =>
                setDraft((d) => ({ ...d, nameVi: e.target.value }))
              }
              placeholder={t("nameVi")}
              className={inputClass}
            />
            <input
              value={draft.nameEn}
              onChange={(e) =>
                setDraft((d) => ({ ...d, nameEn: e.target.value }))
              }
              placeholder={t("nameEn")}
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    category: e.target.value as Category,
                  }))
                }
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
              <input
                value={draft.price}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    price: sanitizePriceInput(e.target.value),
                  }))
                }
                inputMode="numeric"
                className={cn(inputClass, "tabular-nums")}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_OPTIONS.map((s) => {
                const on = draft.sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        sizes: d.sizes.includes(s)
                          ? d.sizes.filter((x) => x !== s)
                          : [...d.sizes, s],
                      }))
                    }
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase",
                      on
                        ? "bg-primary text-primary-foreground"
                        : "bg-card",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            {/* Description */}
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("descriptionLabel")}
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                rows={3}
                maxLength={2000}
                placeholder={t("descriptionPlaceholder")}
                className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-ring"
              />
            </label>

            {/* Stock count */}
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("stockCountLabel")}
              <input
                value={draft.stock}
                onChange={(e) =>
                  setDraft((d) =>
                    d.stock === "" && e.target.value === ""
                      ? d
                      : { ...d, stock: sanitizePriceInput(e.target.value) },
                  )
                }
                inputMode="numeric"
                placeholder={t("stockCountPlaceholder")}
                className="mt-1 w-full rounded-full border border-input bg-background px-3 text-sm tabular-nums normal-case tracking-normal outline-none focus:border-ring"
              />
            </label>

            {/* Gallery manager */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("galleryLabel")}
              </p>
              <div className="mt-1 flex flex-wrap items-start gap-2">
                {keepIds.map((id, index) => (
                  <ProductThumb
                    key={id}
                    src={
                      // `imageIds` and `images` are parallel arrays, so the
                      // storage id's position is the URL's position.
                      product.imageIds && product.images
                        ? product.images[product.imageIds.indexOf(id)]
                        : undefined
                    }
                    fallback={index === 0}
                    onRemove={() =>
                      setKeepIds((prev) => prev.filter((v) => v !== id))
                    }
                    onMove={(delta: number) =>
                      setKeepIds((prev) => {
                        const next = [...prev];
                        const target = index + delta;
                        if (target < 0 || target >= next.length) return prev;
                        [next[index], next[target]] = [next[target]!, next[index]!];
                        return next;
                      })
                    }
                    canMoveUp={index > 0}
                    canMoveDown={index < keepIds.length - 1}
                  />
                ))}
                {addPreviews.map((url, index) => (
                  <ProductThumb
                    key={url}
                    src={url}
                    fallback={keepIds.length === 0 && index === 0}
                    onRemove={() => {
                      URL.revokeObjectURL(url);
                      setAddPreviews((prev) => prev.filter((v) => v !== url));
                      setAddFiles((prev) => prev.filter((_, i) => i !== index));
                    }}
                    onMove={(delta: number) => {
                      setAddPreviews((prev) => {
                        const next = [...prev];
                        const target = index + delta;
                        if (target < 0 || target >= next.length) return prev;
                        [next[index], next[target]] = [next[target]!, next[index]!];
                        return next;
                      });
                      setAddFiles((prev) => {
                        const next = [...prev];
                        const target = index + delta;
                        if (target < 0 || target >= next.length) return prev;
                        [next[index], next[target]] = [next[target]!, next[index]!];
                        return next;
                      });
                    }}
                    canMoveUp={index > 0}
                    canMoveDown={index < addPreviews.length - 1}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => replaceRef.current?.click()}
                  disabled={totalImages >= MAX_PRODUCT_IMAGES}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-[10px] font-semibold uppercase transition-colors disabled:opacity-50"
                >
                  <ImagePlus className="size-3.5" />
                  {t("addMoreImages")}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {totalImages}/{MAX_PRODUCT_IMAGES} · {t("mainImageHint")}
                </span>
              </div>
              <input
                ref={replaceRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickAdditions(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="font-display text-base font-bold leading-snug">
              {name}
            </p>
            {product.nameVi !== product.nameEn && (
              <p className="truncate text-xs text-muted-foreground">
                {lang === "vi" ? product.nameEn : product.nameVi}
              </p>
            )}
            <p className="mt-1 text-sm font-bold tabular-nums">
              {formatVnd(product.price)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {categoryLabel(product.category)}
              </span>
              {product.sizes.map((s) => (
                <span
                  key={s}
                  className="border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                >
                  {s}
                </span>
              ))}
              {product.stock !== null && (
                <span className="border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tabular-nums text-muted-foreground">
                  {t("stockCountShort")} {product.stock}
                </span>
              )}
            </div>
            {product.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {product.inStock ? t("inStock") : t("soldOut")}
          </span>
          <StockToggle
            checked={product.inStock}
            onToggle={(next) =>
              // `.catch` on purpose: a bare `void mutation(...)` turns any
              // rejection into an unhandled promise rejection in the console.
              void convex
                .mutation(api.products.setStock, {
                  id: product._id,
                  inStock: next,
                })
                .catch((error) => {
                  console.error(error);
                  toast.error(t("uploadFailed"));
                })
            }
          />
        </div>

        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors disabled:opacity-60"
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                clearGalleryEdits();
                setDraft({
                  nameVi: product.nameVi,
                  nameEn: product.nameEn,
                  price: String(product.price),
                  category: product.category,
                  sizes: product.sizes,
                  description: product.description ?? "",
                  stock:
                    product.stock === null || product.stock === undefined
                      ? ""
                      : String(product.stock),
                });
              }}
              className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase transition-colors"
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase transition-colors"
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase transition-colors disabled:opacity-60",
            confirmDelete
              ? "bg-primary text-primary-foreground"
              : "bg-card hover:bg-primary hover:text-primary-foreground",
          )}
        >
          <Trash2 className="size-3.5" />
          {confirmDelete ? t("confirmDelete") : t("delete")}
        </button>
      </div>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────
   VietQR bank settings
   ──────────────────────────────────────────────────────────────── */

type BankField = "bankBin" | "bankName" | "accountNo" | "accountHolder";

function BankSettings() {
  const { t } = useI18n();
  const convex = useConvex();
  const payment = useQuery(api.settings.getPayment);
  const [draft, setDraft] = useState<Partial<Record<BankField, string>> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const value = (field: BankField) => draft?.[field] ?? payment?.[field] ?? "";

  const save = async () => {
    setSaving(true);
    try {
      await convex.mutation(api.settings.savePayment, {
        bankBin: value("bankBin"),
        bankName: value("bankName"),
        accountNo: value("accountNo"),
        accountHolder: value("accountHolder"),
      });
      setDraft(null);
      toast.success(t("settingsSaved"));
    } catch (error) {
      // The mutation is owner-only: an expired session must say so, not throw
      // an unhandled rejection into the console.
      console.error(error);
      toast.error(t("sellerSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:bg-card";

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="font-display text-lg font-bold">{t("bankSettings")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("bankSettingsSub")}
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {(
          [
            ["bankNameL", "bankName"],
            ["binL", "bankBin"],
            ["accountNoL", "accountNo"],
            ["holderL", "accountHolder"],
          ] as const
        ).map(([labelKey, field]) => (
          <label
            key={field}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {t(labelKey)}
            <input
              value={value(field)}
              disabled={payment === undefined}
              onChange={(e) =>
                setDraft((d) => ({ ...(d ?? {}), [field]: e.target.value }))
              }
              className={cn("mt-1.5", inputClass)}
            />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || payment === undefined}
            className="h-10 w-full rounded-full bg-primary text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {t("saveSettings")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Orders — every placed order, with a live fulfilment control
   ──────────────────────────────────────────────────────────────── */

function OrdersPanel() {
  const { t, lang } = useI18n();
  const convex = useConvex();
  const orders = useQuery(api.orders.list, {});
  const setStatus = useMutation(api.orders.setStatus);
  const redactAddress = useMutation(api.orders.redactAddress);
  const deleteOrder = useMutation(api.orders.remove);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [redactId, setRedactId] = useState<Id<"orders"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"orders"> | null>(null);
  const [exporting, setExporting] = useState(false);

  // Accounting export: newest orders last, so a second export appends cleanly.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await convex.query(api.orders.exportCsv, {});
      const url = URL.createObjectURL(
        new Blob([result.csv], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportCsvDone"));
    } catch (error) {
      console.error(error);
      toast.error(t("exportCsvFailed"));
    } finally {
      setExporting(false);
    }
  };

  const change = async (id: Id<"orders">, status: OrderStatus) => {
    setBusyId(id);
    try {
      await setStatus({ id, status });
      toast.success(t("orderStatusSaved"));
    } catch (error) {
      console.error(error);
      toast.error(t("orderStatusSaveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // Erases the street address, phone and delivery note of a finished order.
  // The mutation is owner-only on the server, so this is just the trigger.
  const eraseAddress = async (id: Id<"orders">) => {
    setBusyId(id);
    try {
      const result = await redactAddress({ id });
      if (result.redacted) toast.success(t("orderDeleteAddressDone"));
      else toast.error(t("orderDeleteAddressFailed"));
    } catch (error) {
      console.error(error);
      toast.error(t("orderDeleteAddressFailed"));
    } finally {
      setBusyId(null);
      setRedactId(null);
    }
  };

  // Removes a test / duplicate / spam order outright. Confirmed via dialog below.
  const removeOrder = async (id: Id<"orders">) => {
    setBusyId(id);
    try {
      const result = await deleteOrder({ id });
      if (result.removed) toast.success(t("orderDeleteDone"));
      else toast.error(t("orderDeleteFailed"));
    } catch (error) {
      console.error(error);
      toast.error(t("orderDeleteFailed"));
    } finally {
      setBusyId(null);
      setDeleteId(null);
    }
  };

  if (orders === undefined) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("loadingProducts")}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-3xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-soft">
        {t("noOrders")}
      </p>
    );
  }

  /* Operational visibility: an order whose confirmation email never left is
     an order the customer never heard about. Previously that failure was
     completely silent (the mail job is best-effort by design), so the seller
     had no way to know. Count it, name it, and point at the fix. */
  const emailFailed = orders.filter((order) => order.emailStatus === "failed");
  const needsDomain = emailFailed.some(
    (order) => order.emailReason === "domain_not_verified",
  );

  return (
    <>
      {emailFailed.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">
            {t("emailFailedBanner").replace("{n}", String(emailFailed.length))}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {needsDomain ? t("emailFailedDomain") : t("emailFailedGeneric")}
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          <Download className="size-3.5" />
          {exporting ? t("exportCsvBusy") : t("exportCsv")}
        </button>
      </div>
      <ul className="flex flex-col gap-4">
      {orders.map((order) => {
        /* Every field below is read through a local guard. `orders.list`
           normalises rows server-side, but this panel must survive a bad row
           on its own: one order with a missing `items` array or `customer`
           block used to throw `Cannot read properties of undefined` and take
           the entire seller table (and the tab) down with it. */
        const customer = order.customer ?? {};
        const items = Array.isArray(order.items) ? order.items : [];
        const address = [
          customer.street,
          customer.ward,
          customer.district,
          customer.province,
        ]
          .filter(Boolean)
          .join(", ");
        const orderStatus = normalizeStatus(order.status);
        const redacted = order.addressRedactedAt !== undefined;
        // Only finished orders (delivered / cancelled) can have their
        // delivery details erased, and only once per order.
        const canRedact =
          !redacted &&
          (orderStatus === "delivered" || orderStatus === "cancelled");
        return (
          <li
            key={order._id}
            className="rounded-3xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-lg font-bold tabular-nums">
                {order.orderCode || "—"}
              </span>
              <OrderStatusBadge status={order.status} />
              {order.emailStatus === "failed" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                  <MailWarning className="size-3" />
                  {t("emailNotSentBadge")}
                </span>
              )}
              <span className="text-xs tabular-nums text-muted-foreground">
                {stamp(order.createdAt)}
              </span>
              <span className="ml-auto font-display text-lg font-bold tabular-nums">
                {formatVnd(order.total)}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("orderCustomer")}
                </p>
                <p className="mt-1.5 text-sm font-semibold">
                  {customer.name || t("orderUnknownCustomer")}
                </p>
                {order.customerEmail && (
                  <p className="text-sm text-muted-foreground break-all">
                    {order.customerEmail}
                  </p>
                )}
                {redacted ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t("orderAddressRedacted")}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {customer.phone || "—"}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {address || "—"}
                    </p>
                    {customer.note && (
                      <p className="mt-1.5 text-xs italic text-muted-foreground">
                        “{customer.note}”
                      </p>
                    )}
                    {canRedact && (
                      <button
                        type="button"
                        disabled={busyId === order._id}
                        onClick={() => setRedactId(order._id)}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" />
                        {t("orderDeleteAddress")}
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("orderItems")}
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {items.map((item, index) => (
                    <li key={`${item.productId ?? "item"}-${index}`} className="flex gap-2">
                      <span className="tabular-nums text-muted-foreground">
                        ×{item.qty ?? 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        {lang === "vi"
                          ? (item.nameVi ?? item.nameEn)
                          : (item.nameEn ?? item.nameVi)}
                        {item.size && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {item.size}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatVnd((item.price ?? 0) * (item.qty ?? 1))}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("orderPayment")}:{" "}
                  {lang === "vi"
                    ? (PAYMENT_LABELS_VI[order.paymentMethod] ??
                      order.paymentMethod ??
                      "—")
                    : (PAYMENT_LABELS_EN[order.paymentMethod] ??
                      order.paymentMethod ??
                      "—")}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("orderStatusLabel")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ORDER_STATUSES.map((status) => {
                  const on = orderStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={busyId === order._id}
                      onClick={() => void change(order._id, status)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground/70 hover:text-foreground",
                      )}
                    >
                      {t(
                        status === "processing"
                          ? "orderStatusProcessing"
                          : status === "shipped"
                            ? "orderStatusShipped"
                            : status === "out_for_delivery"
                              ? "orderStatusOutForDelivery"
                              : status === "delivered"
                                ? "orderStatusDelivered"
                                : "orderStatusCancelled",
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end border-t border-border pt-3">
                <button
                  type="button"
                  disabled={busyId === order._id}
                  onClick={() => setDeleteId(order._id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" />
                  {t("orderDelete")}
                </button>
              </div>
            </div>
          </li>
        );
      })}
      </ul>

      <AlertDialog
        open={redactId !== null}
        onOpenChange={(open) => {
          if (!open) setRedactId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orderDeleteAddressTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orderDeleteAddressBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={redactId === null}
              onClick={(event) => {
                event.preventDefault();
                if (redactId) void eraseAddress(redactId);
              }}
            >
              {t("orderDeleteAddress")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orderDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("orderDeleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteId === null}
              onClick={(event) => {
                event.preventDefault();
                if (deleteId) void removeOrder(deleteId);
              }}
            >
              {t("orderDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   Live chat inbox — every storefront conversation, newest first
   ──────────────────────────────────────────────────────────────── */

function stamp(ts: number | undefined) {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) return "—";
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ChatInbox() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const threads = useQuery(api.messages.threads, {});
  const markRead = useMutation(api.messages.markRead);
  const send = useMutation(api.messages.send);
  const removeMessage = useMutation(api.messages.remove);
  const clearThread = useMutation(api.messages.clearThread);

  // Moderation acts on the *currently open* thread only.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const clearActive = async () => {
    if (!activeId) return;
    try {
      const res = await clearThread({ conversationId: activeId });
      setConfirmClear(false);
      setSelected(null);
      toast.success(t("chatCleared").replace("{n}", String(res.removed)));
    } catch (error) {
      console.error(error);
      toast.error(t("chatActionFailed"));
    }
  };

  // Fall back to the newest thread so the panel is never empty on open.
  const activeId = selected ?? threads?.[0]?.conversationId ?? null;
  const active = threads?.find((thread) => thread.conversationId === activeId);
  const conversation = useQuery(
    api.messages.conversation,
    activeId ? { conversationId: activeId } : "skip",
  );

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (!activeId) return;
    void markRead({ conversationId: activeId }).catch(() => {
      /* best effort — the badge clears on the next reload anyway */
    });
  }, [activeId, markRead]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [conversation, activeId]);

  const reply = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    try {
      await send({ conversationId: activeId, body, author: "seller" });
      setDraft("");
    } catch {
      toast.error(t("chatSendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Threads */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="border-b border-border bg-primary px-5 py-3.5">
          <h2 className="font-display text-lg font-bold text-primary-foreground">
            {t("sellerTabChat")}
          </h2>
        </div>

        {threads === undefined ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {t("chatInboxEmpty")}
          </p>
        ) : (
          <ul className="max-h-[28rem] overflow-y-auto">
            {threads.map((thread) => {
              const on = thread.conversationId === activeId;
              return (
                <li key={thread.conversationId}>
                  <button
                    type="button"
                    onClick={() => setSelected(thread.conversationId)}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors",
                      on ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {thread.name || thread.email || t("chatInboxAnonymous")}
                      </span>
                      {thread.unread > 0 && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                          {thread.unread} {t("chatUnreadOne")}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {stamp(thread.lastAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {thread.lastFrom === "customer" ? "" : `${t("chatShop")}: `}
                      {thread.lastBody}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Active thread */}
      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold">
              {active?.name || active?.email || t("chatInboxAnonymous")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {active ? `${active.messageCount} ${t("chatMessageUnit")}` : ""}
            </p>
          </div>
          {activeId && (
            <button
              type="button"
              onClick={() => {
                if (confirmClear) void clearActive();
                else setConfirmClear(true);
              }}
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                confirmClear
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground/70 hover:text-foreground",
              )}
            >
              <Trash2 className="size-3.5" />
              {confirmClear ? t("chatClearConfirm") : t("chatClearThread")}
            </button>
          )}
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {!activeId ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("chatThreadLoad")}
            </p>
          ) : (
            conversation?.map((message) => {
              const mine = message.author === "seller";
              return (
                <div
                  key={message._id}
                  className={cn(
                    "group flex items-start gap-1",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  {!mine && (
                    <button
                      type="button"
                      onClick={() =>
                        void removeMessage({ id: message._id }).catch((error) => {
                          console.error(error);
                          toast.error(t("chatActionFailed"));
                        })
                      }
                      aria-label={t("chatDeleteMessage")}
                      title={t("chatDeleteMessage")}
                      className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-secondary text-foreground",
                    )}
                  >
                    {!mine && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {message.name || t("chatSenderBadge")}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                    <p className="mt-1 text-[10px] tabular-nums opacity-70">
                      {stamp(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={reply}
          className="flex items-center gap-2 border-t border-border bg-background/60 p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder={t("chatReplyPlaceholder")}
            aria-label={t("chatReplyPlaceholder")}
            className="h-11 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={!activeId || sending || !draft.trim()}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t("chatReplySend")}
          </button>
        </form>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Promotional broadcast (Resend) — opt-in audience only
   ──────────────────────────────────────────────────────────────── */

type BroadcastResult = {
  ok: boolean;
  reason:
    | "ok"
    | "partial"
    | "missing_key"
    | "no_recipients"
    | "empty_campaign"
    | "bad_test_address";
  sent: number;
  failed: number;
  total: number;
  mode: "test" | "broadcast";
};

function BroadcastPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const sendBroadcast = useAction(api.marketing.sendBroadcast);
  const audience = useQuery(api.users.marketingAudience);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [from, setFrom] = useState("");
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  // Default the test address to the signed-in owner so proof-reading a
  // campaign never means emailing the whole list.
  useEffect(() => {
    setTestTo((prev) => prev || (user?.email ?? ""));
  }, [user]);

  const run = async (mode: "test" | "broadcast") => {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("broadcastEmptyCampaign"));
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await sendBroadcast({
        subject: subject.trim(),
        body: body.trim(),
        ...(from.trim() ? { from: from.trim() } : {}),
        ...(mode === "test" && testTo.trim() ? { testRecipient: testTo.trim() } : {}),
      });
      setResult(res);
      if (res.ok && res.mode === "test") {
        toast.success(t("broadcastTestSent").replace("{n}", String(res.sent)));
      } else if (res.ok) {
        toast.success(t("broadcastSent").replace("{n}", String(res.sent)));
        setSubject("");
        setBody("");
      } else if (res.reason === "missing_key") {
        toast.error(t("broadcastNoKey"));
      } else if (res.reason === "no_recipients") {
        toast.error(t("broadcastNoRecipients"));
      } else if (res.reason === "bad_test_address") {
        toast.error(t("broadcastBadTestAddress"));
      } else {
        toast.error(
          t("broadcastPartial")
            .replace("{n}", String(res.sent))
            .replace("{f}", String(res.failed)),
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(t("broadcastNoKey"));
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    void run("broadcast");
  };

  const inputClass =
    "mt-1.5 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-ring";

  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="border-b border-border bg-primary px-5 py-3.5">
        <h2 className="font-display text-lg font-bold text-primary-foreground">
          {t("sellerTabBroadcast")}
        </h2>
        <p className="mt-0.5 text-xs text-primary-foreground/80">
          {t("broadcastSub")}
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("broadcastAudience")}
          </span>
          <span className="font-display text-xl font-bold tabular-nums">
            {audience === undefined ? "…" : audience.length}
          </span>
        </div>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("broadcastSubjectLabel")}
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder={t("broadcastSubjectPlaceholder")}
            className={inputClass}
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("broadcastBodyLabel")}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={8000}
            placeholder={t("broadcastBodyPlaceholder")}
            className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-ring"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("broadcastFromLabel")}
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={t("broadcastFromPlaceholder")}
            className={inputClass}
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("broadcastTestToLabel")}
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder={t("broadcastTestToPlaceholder")}
            className={inputClass}
          />
        </label>

        {result && !result.ok && result.reason !== "missing_key" && (
          <p className="rounded-2xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            {result.reason === "no_recipients"
              ? t("broadcastNoRecipients")
              : t("broadcastPartial")
                  .replace("{n}", String(result.sent))
                  .replace("{f}", String(result.failed))}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void run("test")}
            disabled={sending || !testTo.trim() || !subject.trim() || !body.trim()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t("broadcastTestCta")}
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("broadcastSending")}
              </>
            ) : (
              t("broadcastSendCta")
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Review moderation
   ──────────────────────────────────────────────────────────────── */

/** Stars, read-only. Reused for the average and for each review row. */
function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Every customer review, newest first, with a delete button.
 *
 * Without this the shop could not take down a bad or abusive review at all:
 * the backend functions existed but there was no screen that called them, so
 * the only options were to leave it live or edit the database by hand.
 */
function ReviewsPanel() {
  const { t } = useI18n();
  const reviews = useQuery(api.reviews.all);
  const removeReview = useMutation(api.reviews.remove);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const del = async (id: Id<"reviews">) => {
    setPendingId(id);
    try {
      const result = await removeReview({ id });
      if (result.removed) {
        toast.success(t("reviewRemoved"));
        setConfirmId(null);
      } else {
        toast.error(t("reviewRemoveFailed"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("reviewRemoveFailed"));
    } finally {
      setPendingId(null);
    }
  };

  const average =
    reviews && reviews.length > 0
      ? Math.round(
          (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10,
        ) / 10
      : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary px-5 py-3.5">
        <h2 className="font-display text-lg font-bold text-primary-foreground">
          {t("reviewsTitle")}
        </h2>
        <div className="flex items-center gap-3 text-xs text-primary-foreground">
          {reviews && reviews.length > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Stars value={Math.round(average)} />
              {average.toFixed(1)} / 5
            </span>
          )}
          <span className="rounded-full border border-primary-foreground/40 px-2.5 py-0.5 font-semibold tabular-nums">
            {reviews?.length ?? "…"}
          </span>
        </div>
      </div>

      {reviews === undefined ? (
        <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loadingReviews")}
        </div>
      ) : reviews.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          {t("noReviews")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {reviews.map((review) => (
            <li key={review._id} className="flex gap-4 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={review.rating} />
                  <span className="text-sm font-semibold">{review.authorName}</span>
                  {review.orderCode && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {review.orderCode}
                    </span>
                  )}
                  {review.photoCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <ImagePlus className="size-2.5" />
                      {review.photoCount}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {review.productName}
                  {review.authorEmail && (
                    <span className="ml-2 font-normal opacity-70">
                      {review.authorEmail}
                    </span>
                  )}
                </p>
                {review.text && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                    {review.text}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>

              {confirmId === review._id ? (
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={pendingId === review._id}
                    onClick={() => void del(review._id)}
                    className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {pendingId === review._id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      t("reviewConfirmDelete")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(review._id)}
                  aria-label={t("reviewDelete")}
                  className="shrink-0 self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Newsletter subscribers collected by the footer form.
 *
 * Sits next to the broadcast composer because that is the only thing the list
 * is for — without a screen showing who signed up, a list you cannot see or
 * delete from is not really consent you are honouring.
 */
function SubscriberPanel() {
  const { t } = useI18n();
  const subscribers = useQuery(api.newsletter.list);
  const removeSubscriber = useMutation(api.newsletter.remove);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const del = async (id: Id<"subscribers">) => {
    setPendingId(id);
    try {
      await removeSubscriber({ id });
      toast.success(t("subscriberRemoved"));
    } catch (error) {
      console.error(error);
      toast.error(t("subscriberRemoveFailed"));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-3.5">
        <h2 className="font-display text-lg font-bold text-primary-foreground">
          {t("subscribersTitle")}
        </h2>
        <span className="rounded-full border border-primary-foreground/40 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
          {subscribers?.length ?? "…"}
        </span>
      </div>

      {subscribers === undefined ? (
        <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : subscribers.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          {t("noSubscribers")}
        </p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {subscribers.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{row.email}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString("vi-VN")}
              </span>
              <button
                type="button"
                disabled={pendingId === row.id}
                onClick={() => void del(row.id)}
                aria-label={t("subscriberRemove")}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {pendingId === row.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */

export default function Admin() {
  const { isLoading, isProfileLoading, isAuthenticated, user, signOut } =
    useAuth();
  const navigate = useNavigate();

  // Identity is the ONLY gate. There used to be a client-side PIN here as a
  // "second factor", but it was not one: the code shipped in the JS bundle, so
  // anyone could read it, and it protected nothing the server did not already
  // protect. Every seller-only Convex function calls `requireOwner`
  // (src/lib/owner.ts), which checks the real Google session — that is the
  // access control. Removing the PIN removes a false sense of security without
  // weakening anything.
  // Only the store owner's Google account may proceed;
  // anyone else (signed out, or a customer) goes straight back to the store.
  const isOwner =
    isAuthenticated &&
    !!user?.email &&
    user.email.trim().toLowerCase() === ADMIN_EMAIL;

  // The identity check must not run on a half-read profile: right after the
  // OAuth callback the session is valid a tick before the profile document is
  // readable, and deciding "not the owner" in that window bounced the seller
  // back to the storefront right after signing in. Wait for the profile (with
  // the hook's grace window) before deciding anything.
  const deciding = isLoading || isProfileLoading;

  useEffect(() => {
    if (!deciding && !isOwner) navigate("/", { replace: true });
  }, [deciding, isOwner, navigate]);

  // Signs the owner out — the only way out of /seller.
  const lock = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (deciding || !isOwner) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return <AdminPanel onLock={lock} />;
}

function AdminPanel({ onLock }: { onLock: () => Promise<void> }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<
    "products" | "orders" | "chat" | "reviews" | "broadcast"
  >("products");
  const products = useQuery(api.products.list);
  const unread = useQuery(api.messages.unreadTotal);

  const TABS = [
    { id: "products", label: t("sellerTabProducts"), icon: Store },
    { id: "orders", label: t("sellerTabOrders"), icon: Package },
    { id: "chat", label: t("sellerTabChat"), icon: MessageCircle },
    { id: "reviews", label: t("sellerTabReviews"), icon: Star },
    { id: "broadcast", label: t("sellerTabBroadcast"), icon: Send },
  ] as const;

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
            B
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-bold tracking-tight">
              {t("adminTitle")}
            </span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {t("adminSub")}
            </span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase transition-colors"
            >
              <Store className="size-3.5" />
              {t("backToStore")}
            </Link>
            <button
              type="button"
              onClick={() => void onLock()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors"
            >
              <LogOut className="size-3.5" />
              {t("lockSellerSession")}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={on}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground/70 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {id === "chat" && !!unread && unread > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      on
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "orders" ? (
        <div className="mx-auto max-w-5xl px-4 py-8">
          <OrdersPanel />
        </div>
      ) : tab === "chat" ? (
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ChatInbox />
        </div>
      ) : tab === "reviews" ? (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <ReviewsPanel />
        </div>
      ) : tab === "broadcast" ? (
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
          <BroadcastPanel />
          <SubscriberPanel />
        </div>
      ) : (
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[400px_1fr]">
        {/* Left: new product + bank settings */}
        <div className="flex flex-col gap-6">
          <NewProductForm />
          <BankSettings />
        </div>

        {/* Right: product list */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-3.5">
            <h2 className="font-display text-lg font-bold text-primary-foreground">
              {t("productsLabel")}
            </h2>
            <span className="rounded-full border border-primary-foreground/40 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
              {products?.length ?? "…"}
            </span>
          </div>

          {products === undefined ? (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loadingProducts")}
            </div>
          ) : products.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {t("noProducts")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3 p-4">
              {products.map((product) => (
                <ProductRow
                  key={product._id}
                  product={product as StoreProduct}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      )}
    </main>
  );
}
