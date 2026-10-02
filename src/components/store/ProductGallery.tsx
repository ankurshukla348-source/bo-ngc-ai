import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Product photo gallery.
 *
 * Renders the primary photo alone when a product has only one image, so the
 * common case is byte-for-byte what it was before galleries existed. With two
 * or more it becomes a slider: arrows, clickable thumbnails, and arrow-key
 * support. A deleted image URL degrades to the next valid one instead of a
 * broken frame, because the seller can remove a photo at any moment and every
 * shopper has that page open.
 */
export function ProductGallery({
  images,
  alt,
  className,
  imgClassName,
  showThumbs = true,
}: {
  images: (string | null | undefined)[];
  alt: string;
  className?: string;
  imgClassName?: string;
  showThumbs?: boolean;
}) {
  const valid = images.filter((src): src is string => !!src);
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(valid.length - 1, 0));

  // Swipe tracking. `touchstart` records the origin; `touchend` decides whether
  // the gesture was a horizontal flick. On a phone the arrow buttons are easy to
  // miss entirely, so a swipe has to work as the primary way through the
  // gallery — but only once there is more than one photo, and only when the
  // gesture is clearly horizontal so a vertical scroll is never hijacked.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  if (valid.length === 0) return null;

  if (valid.length === 1) {
    return (
      <img
        src={valid[0]}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", imgClassName, className)}
      />
    );
  }

  const go = (delta: number) =>
    setIndex((prev) => (prev + delta + valid.length) % valid.length);

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        role="group"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(1);
          }
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          touchStartX.current = touch.clientX;
          touchStartY.current = touch.clientY;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          const startY = touchStartY.current;
          touchStartX.current = null;
          touchStartY.current = null;
          if (startX === null || startY === null) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          const dx = touch.clientX - startX;
          const dy = touch.clientY - startY;
          // Require a clearly horizontal flick: a mostly-vertical gesture is the
          // page scrolling, not the gallery changing photo.
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          go(dx < 0 ? 1 : -1);
        }}
      >
        <img
          src={valid[safeIndex]}
          alt={`${alt} — ${safeIndex + 1}/${valid.length}`}
          loading="lazy"
          className={cn("h-full w-full object-cover", imgClassName)}
        />

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Ảnh trước"
          // The visible circle stays 32px so the card is not dominated by it, but
          // the pseudo-element grows the TAP TARGET to ~48px — the size a thumb
          // can actually hit. Without this the arrows are fiddly on a phone.
          className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-soft transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-background"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Ảnh tiếp theo"
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-soft transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-background"
        >
          <ChevronRight className="size-4" />
        </button>

        <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-soft">
          {safeIndex + 1}/{valid.length}
        </span>
      </div>

      {showThumbs && (
        <div className="flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain p-2 [scrollbar-width:thin]">
          {valid.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === safeIndex}
              className={cn(
                "size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity",
                i === safeIndex
                  ? "border-primary"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}