import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { placeholderArt } from "@/lib/art";
import { CATEGORIES, SIZE_OPTIONS, type Category } from "@/lib/catalog";
import { ADMIN_PIN, isAdminUnlocked, lockAdmin, tryUnlockAdmin } from "@/lib/admin";
import { formatVnd, sanitizePriceInput } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { StoreProduct } from "@/components/store/ProductCard";
import { cn } from "@/lib/utils";
import { useConvex, useQuery } from "convex/react";
import {
  Camera,
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Store,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────────
   PIN gate — v1 uses a hardcoded PIN (see src/lib/admin.ts)
   ──────────────────────────────────────────────────────────────── */

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (tryUnlockAdmin(pin)) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-soft-lg"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">
            M
          </span>
          <span>
            <span className="block font-display text-xl font-bold tracking-tight">
              {t("adminTitle")}
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {t("adminSub")}
            </span>
          </span>
        </div>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("pinPlaceholder")}
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="••••"
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-ring focus:bg-card"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-full bg-accent px-3 py-2 text-center text-xs font-semibold text-accent-foreground">
            {t("pinError")}
          </p>
        )}

        <button
          type="submit"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
        >
          <Lock className="size-4" />
          {t("unlock")}
        </button>

        <p className="mt-5 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
          {t("pinHint")}
        </p>
        <Link
          to="/"
          className="mt-3 block text-center text-xs font-semibold uppercase tracking-wide underline-offset-4 hover:underline"
        >
          ← {t("backToStore")}
        </Link>
      </form>
    </main>
  );
}

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
   New product form: dropzone + camera capture + fields
   ──────────────────────────────────────────────────────────────── */

function NewProductForm({ variantSeed }: { variantSeed: number }) {
  const { t, lang, categoryLabel } = useI18n();
  const convex = useConvex();

  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState<Category>("tops");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [inStock, setInStock] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const acceptFile = (files: FileList | null) => {
    const next = files?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error(t("uploadFailed"));
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const reset = () => {
    setNameVi("");
    setNameEn("");
    setCategory("tops");
    setPrice("");
    setSizes(["S", "M", "L", "XL"]);
    setInStock(true);
    setFile(null);
    setPreview(null);
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
      let imageSrc: string | undefined;

      if (file) {
        const uploadUrl = await convex.mutation(
          api.products.generateUploadUrl,
          {},
        );
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status}`);
        const data = (await res.json()) as { storageId: Id<"_storage"> };
        imageStorageId = data.storageId;
      } else {
        imageSrc = placeholderArt(trimmedEn || trimmedVi, variantSeed);
      }

      await convex.mutation(api.products.add, {
        nameVi: trimmedVi || trimmedEn,
        nameEn: trimmedEn || trimmedVi,
        category,
        price: priceValue,
        sizes,
        inStock,
        ...(imageStorageId ? { imageStorageId } : {}),
        ...(imageSrc ? { imageSrc } : {}),
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
            acceptFile(e.dataTransfer.files);
          }}
          className={cn(
            "relative flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 text-center transition-colors",
            dragging ? "bg-accent/10" : "bg-background",
          )}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt=""
                className="max-h-44 rounded-xl border border-border object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-xs font-semibold uppercase underline-offset-4 hover:underline"
              >
                {t("cancel")}
              </button>
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
            className="hidden"
            onChange={(e) => {
              acceptFile(e.target.files);
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
              acceptFile(e.target.files);
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
  });

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
      await convex.mutation(api.products.update, {
        id: product._id,
        nameVi: draft.nameVi,
        nameEn: draft.nameEn,
        category: draft.category,
        price: Number(sanitizePriceInput(draft.price)) || 0,
        sizes: draft.sizes.length ? draft.sizes : product.sizes,
      });
      setEditing(false);
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
            </div>
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
              void convex.mutation(api.products.setStock, {
                id: product._id,
                inStock: next,
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
                setDraft({
                  nameVi: product.nameVi,
                  nameEn: product.nameEn,
                  price: String(product.price),
                  category: product.category,
                  sizes: product.sizes,
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
            onClick={() => setEditing(true)}
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
              ? "bg-accent text-white"
              : "bg-card hover:bg-accent hover:text-white",
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
   Page
   ──────────────────────────────────────────────────────────────── */

export default function Admin() {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked());

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return <AdminPanel onLock={() => { lockAdmin(); setUnlocked(false); }} />;
}

function AdminPanel({ onLock }: { onLock: () => void }) {
  const { t } = useI18n();
  const products = useQuery(api.products.list);

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
            M
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
              onClick={onLock}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors"
            >
              <Lock className="size-3.5" />
              {t("lock")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[400px_1fr]">
        {/* Left: new product + bank settings */}
        <div className="flex flex-col gap-6">
          <NewProductForm variantSeed={products?.length ?? 0} />
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
    </main>
  );
}
