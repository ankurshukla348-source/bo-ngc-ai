import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, ImagePlus, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/** Storage ids are opaque strings handed back by the upload URL. */
type UploadedPhoto = { id: string; url: string };

/** Mirrors MAX_PHOTOS in src/convex/reviews.ts. The server enforces it too. */
const MAX_PHOTOS = 4;

/**
 * Customer review form + list for one product.
 *
 * The "already reviewed" state is the common one, so it renders as a compact
 * confirmation rather than an error. Photo upload is capped and each file is
 * validated as an image before it ever reaches the network.
 */
export function ReviewSection({
  productId,
  canReview,
}: {
  productId: string;
  /** False when the visitor is signed out or not yet eligible. */
  canReview: boolean;
}) {
  const { t } = useI18n();
  const reviews = useQuery(api.reviews.forProduct, { productId: productId as never });
  const summary = useQuery(api.reviews.summary, { productId: productId as never });
  const createReview = useMutation(api.reviews.create);
  const uploadUrl = useMutation(api.reviews.generatePhotoUrl);

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = reviews ?? [];
  const average = summary?.average ?? 0;
  const count = summary?.count ?? 0;

  const pickPhotos = async (files: FileList | null) => {
    const files2 = Array.from(files ?? []).slice(
      0,
      MAX_PHOTOS - photos.length,
    );
    const images = files2.filter((f) => f.type.startsWith("image/"));
    if (images.length !== files2.length) toast.error(t("reviewPhotoTypeError"));

    for (const file of images) {
      try {
        const url = await uploadUrl({});
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(String(res.status));
        const { storageId } = (await res.json()) as { storageId: string };
        const preview = URL.createObjectURL(file);
        setPhotos((prev) =>
          prev.length < MAX_PHOTOS ? [...prev, { id: storageId, url: preview }] : prev,
        );
      } catch {
        toast.error(t("reviewPhotoFailed"));
      }
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = await createReview({
        productId: productId as never,
        rating,
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(photos.length ? { photos: photos.map((p) => p.id) } : {}),
      });
      if (result.created) {
        toast.success(t("reviewSubmitted"));
        setOpen(false);
        setText("");
        setPhotos([]);
        setRating(5);
      } else if (result.reason === "duplicate") {
        toast.error(t("reviewDuplicate"));
        setOpen(false);
      } else if (result.reason === "not_eligible") {
        toast.error(t("reviewNotEligible"));
        setOpen(false);
      } else {
        toast.error(t("reviewFailed"));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("reviewFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">
          {t("reviewsTitle")}
          {count > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {average} ({count})
            </span>
          )}
        </h3>
        {canReview && !open && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="rounded-full"
          >
            {t("reviewWriteCta")}
          </Button>
        )}
      </div>

      {!canReview && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("reviewOnlyDelivered")}
        </p>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("reviewRatingLabel")}
            </p>
            <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  aria-label={`${value} sao`}
                  aria-pressed={rating === value}
                >
                  <Star
                    className={
                      value <= (hovered || rating)
                        ? "size-7 fill-brand-rose text-brand-ink"
                        : "size-7 text-muted-foreground/40"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("reviewTextPlaceholder")}
            aria-label={t("reviewTextPlaceholder")}
            className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
          />

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative size-16 overflow-hidden rounded-xl border border-border">
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                    }
                    aria-label={t("reviewRemovePhoto")}
                    className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => pickPhotos(e.target.files)}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-3.5" />
              {t("reviewAddPhoto")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {photos.length}/{MAX_PHOTOS}
            </span>
            <Button
              size="sm"
              className="ml-auto rounded-full"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? t("reviewSending") : t("reviewSubmit")}
            </Button>
          </div>
        </div>
      )}

      {reviews === undefined ? (
        <p className="mt-3 text-sm text-muted-foreground">…</p>
      ) : list.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("reviewsEmpty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((review) => (
            <li
              key={review._id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{review.author}</span>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    <CheckCircle2 className="size-3" />
                    {t("reviewVerified")}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="mt-1.5 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={
                      value <= review.rating
                        ? "size-3.5 fill-brand-rose text-brand-ink"
                        : "size-3.5 text-muted-foreground/30"
                    }
                  />
                ))}
              </div>
              {review.text && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {review.text}
                </p>
              )}
              {review.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photos.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="size-20 rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}