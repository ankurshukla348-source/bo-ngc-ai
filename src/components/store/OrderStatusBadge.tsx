import { normalizeStatus } from "@/lib/orders";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Fulfillment status pill, shared by the customer's order list and the seller
 * dashboard so the two always agree on wording and colour — including for
 * orders that still carry a legacy status such as "new".
 */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: string | undefined;
  className?: string;
}) {
  const { t } = useI18n();
  const value = normalizeStatus(status);

  const tone: Record<string, string> = {
    processing: "bg-secondary text-foreground border-border",
    shipped: "bg-[#e8f0fe] text-[#1b3a6b] border-[#c9dbfb]",
    out_for_delivery: "bg-[#fff2dc] text-[#7a4a06] border-[#f5dcb4]",
    delivered: "bg-[#e4f6ea] text-[#1d6b34] border-[#c2e8d0]",
    cancelled: "bg-[#fdeaea] text-[#8f1f1f] border-[#f5cdcd]",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        tone[value],
        className,
      )}
    >
      {t(
        value === "processing"
          ? "orderStatusProcessing"
          : value === "shipped"
            ? "orderStatusShipped"
            : value === "out_for_delivery"
              ? "orderStatusOutForDelivery"
              : value === "delivered"
                ? "orderStatusDelivered"
                : "orderStatusCancelled",
      )}
    </span>
  );
}
