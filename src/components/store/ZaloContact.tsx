import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n";

/** Floating Zalo contact widget: fixed bottom-right button opening a popup
 *  with a scannable Zalo QR code. Links out to zalo.me chat when tapped. */
export function ZaloContact() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button — fixed bottom-right */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("zaloLabel")}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#0068ff] text-white shadow-soft-lg transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="size-6" />
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0068ff] ring-1 ring-[#0068ff]/30">
          Z
        </span>
      </button>

      {/* QR popup modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("zaloScanTitle")}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("zaloClose")}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent"
            >
              <X className="size-4" />
            </button>

            <h2 className="font-display text-xl font-bold tracking-tight">
              {t("zaloScanTitle")}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t("zaloScanSub")}
            </p>

            {/* Zalo QR — official Zalo QR for 0793578058 */}
            <div className="mx-auto mt-5 flex w-fit items-center justify-center rounded-2xl border border-border bg-white p-3">
              <QRCodeSVG
                value="https://zalo.me/0793578058"
                size={200}
                level="M"
                imageSettings={{
                  src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%230068ff'/%3E%3Ctext x='16' y='21' font-family='Arial' font-size='11' font-weight='bold' fill='white' text-anchor='middle'%3EZ%3C/text%3E%3C/svg%3E",
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            <a
              href="https://zalo.me/0793578058"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0068ff] text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="size-4" />
              {t("zaloLabel")}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
