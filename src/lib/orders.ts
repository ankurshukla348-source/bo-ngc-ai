/**
 * Order fulfilment statuses — one list, shared by the seller dashboard, the
 * customer's order tracking and the Convex status mutation, so the two can
 * never drift into writing a status the other cannot read.
 */

export const ORDER_STATUSES = [
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Orders placed before this status list existed stored "new" / "confirmed".
 * They are shown as "Đang xử lý" instead of rendering a blank badge.
 */
const LEGACY_ALIASES: Record<string, OrderStatus> = {
  new: "processing",
  confirmed: "processing",
  pending: "processing",
  shipping: "shipped",
  complete: "delivered",
  canceled: "cancelled",
};

export function normalizeStatus(value: string | undefined): OrderStatus {
  if (!value) return "processing";
  const key = value.trim().toLowerCase();
  if (isOrderStatus(key)) return key;
  return LEGACY_ALIASES[key] ?? "processing";
}

/** Payment method labels live next to the statuses: both are seller-facing. */
export const PAYMENT_LABELS_VI: Record<string, string> = {
  vietqr: "VietQR",
  cod: "COD",
  wallet: "Ví điện tử",
};

export const PAYMENT_LABELS_EN: Record<string, string> = {
  vietqr: "Bank transfer",
  cod: "Cash on delivery",
  wallet: "E-wallet",
};
