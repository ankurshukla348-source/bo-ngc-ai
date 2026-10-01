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

/* ── Defensive row normalisation ────────────────────────────────
   The `orders` table is read with `schemaValidation: false` and has been
   written by several generations of the app, so a row stored by an older
   build (or edited by hand) can legitimately be missing fields that the
   declared type promises. Every order query funnels its rows through
   `normalizeOrder` so the browser never receives `undefined` for something
   it is about to call `.map()` / `.trim()` / arithmetic on — which is what
   produced "Cannot read properties of undefined (reading 'map')" white
   screens in the order lists.

   The helpers below are pure and shared by the Convex queries and the UI. */

/** Last-resort item label when a stored line has no usable product name. */
export const FALLBACK_ITEM_NAME_VI = "Sản phẩm không khả dụng";
export const FALLBACK_ITEM_NAME_EN = "Product unavailable";

const PAYMENT_METHODS = ["vietqr", "cod", "wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One order line, with a name that is always renderable. */
export function normalizeOrderItem(item: unknown): Record<string, unknown> {
  if (!isRecord(item)) {
    return {
      productId: "",
      nameVi: FALLBACK_ITEM_NAME_VI,
      nameEn: FALLBACK_ITEM_NAME_EN,
      price: 0,
      size: "",
      qty: 1,
    };
  }
  const nameVi = asString(item.nameVi);
  const nameEn = asString(item.nameEn);
  item.nameVi = nameVi || nameEn || FALLBACK_ITEM_NAME_VI;
  item.nameEn = nameEn || nameVi || FALLBACK_ITEM_NAME_EN;
  item.productId = asString(item.productId);
  item.size = asString(item.size, "Free Size");
  item.price = Math.max(0, asNumber(item.price));
  item.qty = Math.max(1, Math.round(asNumber(item.qty, 1)));
  if (typeof item.imageSrc !== "string" || !item.imageSrc) {
    delete item.imageSrc;
  }
  return item;
}

/** The delivery block, with every field guaranteed to be a string. */
export function normalizeOrderCustomer(
  customer: unknown,
): Record<string, unknown> {
  const source = isRecord(customer) ? customer : {};
  return {
    name: asString(source.name, REDACTED_TEXT),
    phone: asString(source.phone, REDACTED_TEXT),
    province: asString(source.province, REDACTED_TEXT),
    district: asString(source.district, REDACTED_TEXT),
    ward: asString(source.ward, REDACTED_TEXT),
    street: asString(source.street, REDACTED_TEXT),
    ...(typeof source.note === "string" && source.note.trim()
      ? { note: source.note }
      : {}),
  };
}

/**
 * Repair an order row in place and return it.
 *
 * Mutating in place keeps the document identity (and therefore its `_id`
 * type) intact, so callers keep the exact shape Convex generated.
 */
export function normalizeOrder<T extends { _id: string }>(doc: T): T {
  const row = doc as unknown as Record<string, unknown>;

  row.orderCode = asString(row.orderCode, "—");
  row.status = normalizeStatus(
    typeof row.status === "string" ? row.status : undefined,
  );
  row.createdAt = asNumber(row.createdAt, 0);

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const items: Record<string, unknown>[] = rawItems
    .filter(isRecord)
    .map(normalizeOrderItem);
  // An order with no renderable line still has to show *something* — an empty
  // `items` array is what the customer list used to map over unguarded.
  row.items = items.length > 0 ? items : [normalizeOrderItem(undefined)];

  row.customer = normalizeOrderCustomer(row.customer);

  const method = row.paymentMethod;
  row.paymentMethod = PAYMENT_METHODS.includes(method as PaymentMethod)
    ? method
    : "cod";

  row.subtotal = Math.max(0, asNumber(row.subtotal));
  row.shippingFee = Math.max(0, asNumber(row.shippingFee));
  // A legacy row can be missing `total`; recompute it rather than showing 0đ.
  row.total = Math.max(
    0,
    asNumber(row.total, (row.subtotal as number) + (row.shippingFee as number)),
  );
  if (row.total === 0 && (row.subtotal as number) + (row.shippingFee as number) > 0) {
    row.total = (row.subtotal as number) + (row.shippingFee as number);
  }

  if (typeof row.guestEmail !== "string" || !row.guestEmail) {
    delete row.guestEmail;
  }
  if (typeof row.customerEmail !== "string" || !row.customerEmail) {
    delete row.customerEmail;
  }
  return doc;
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

/** Placeholder written over every delivery field once the details are erased. */
export const REDACTED_TEXT = "Đã xóa";

/** True for the finished orders whose delivery details may be erased. */
export function isRedactableStatus(value: string | undefined): boolean {
  const status = normalizeStatus(value);
  return status === "delivered" || status === "cancelled";
}

/**
 * The customer block of a finished order with its delivery details erased.
 * The name stays (it is not part of the shipping record), while street, ward,
 * district, province, phone and the delivery note are dropped entirely.
 */
export function redactCustomer(customer: {
  name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
}): {
  name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
} {
  return {
    name: customer.name,
    phone: REDACTED_TEXT,
    province: REDACTED_TEXT,
    district: REDACTED_TEXT,
    ward: REDACTED_TEXT,
    street: REDACTED_TEXT,
  };
}
