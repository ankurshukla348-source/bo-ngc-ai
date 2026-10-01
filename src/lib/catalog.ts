/** Store catalog constants shared by the client and Convex functions.
 *  Keep this module pure (no React, no browser APIs). */

export const CATEGORIES = [
  "tops",
  "dresses",
  "cardigans",
  "trousers",
  "bestsellers",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SIZE_OPTIONS = ["S", "M", "L", "XL", "Free Size"] as const;

export type SizeOption = (typeof SIZE_OPTIONS)[number];

/* ── Shipping ──────────────────────────────────────────────────
   Fees mirror the published policy exactly:
     • Diên Khánh (nội thành) ............ 15.000đ / order
     • Nha Trang và các huyện lân cận ... 20.000đ / order
     • Các tỉnh thành khác .............. 30.000đ / order
   Orders from 400.000đ ship free in every zone.                       */

/** Free shipping from this order value, in every zone. */
export const FREE_SHIPPING_THRESHOLD = 400_000;

export type ShippingZoneId = "dien_khanh" | "nha_trang" | "national";

export type ShippingZone = {
  id: ShippingZoneId;
  fee: number;
  labelVi: string;
  labelEn: string;
  /** Lowercase, diacritic-free keywords matched against the address. */
  keywords: readonly string[];
};

/**
 * Ordered cheapest-first: the first zone whose keyword appears in the
 * delivery address wins, so "Diên Khánh" never falls through to the Nha Trang
 * rule. Anything unrecognised is charged the national rate.
 */
export const SHIPPING_ZONES: readonly ShippingZone[] = [
  {
    id: "dien_khanh",
    fee: 15_000,
    labelVi: "Nội thành Diên Khánh",
    labelEn: "Diên Khánh inner city",
    keywords: ["dien khanh", "dienkhanh"],
  },
  {
    id: "nha_trang",
    fee: 20_000,
    labelVi: "Nha Trang và các huyện lân cận",
    labelEn: "Nha Trang and neighbouring districts",
    keywords: [
      "nha trang",
      "nhatrang",
      "cam lam",
      "camlam",
      "dien thap",
      "dienthap",
      "ninh hai",
      "ninhhai",
    ],
  },
  {
    id: "national",
    fee: 30_000,
    labelVi: "Các tỉnh thành khác",
    labelEn: "All other provinces",
    keywords: [],
  },
] as const;

export const DEFAULT_SHIPPING_ZONE: ShippingZone = SHIPPING_ZONES[2]!;

/** Lowercase and strip Vietnamese diacritics so "Diên Khánh" ≈ "dien khanh". */
export function normalizePlaceName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type ShippingAddress = {
  province?: string | null;
  district?: string | null;
  ward?: string | null;
};

/** The cheapest zone that matches the delivery address. */
export function shippingZoneFor(
  address?: ShippingAddress | null,
): ShippingZone {
  const haystack = normalizePlaceName(
    [address?.ward, address?.district, address?.province]
      .filter(Boolean)
      .join(" "),
  );
  if (!haystack) return DEFAULT_SHIPPING_ZONE;
  for (const zone of SHIPPING_ZONES) {
    if (zone.keywords.some((keyword) => haystack.includes(keyword))) {
      return zone;
    }
  }
  return DEFAULT_SHIPPING_ZONE;
}

/** Flat shipping fee in VND for the order's zone, waived above the threshold. */
export function shippingFeeFor(
  subtotal: number,
  address?: ShippingAddress | null,
): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return shippingZoneFor(address).fee;
}

/* ── Defensive row normalisation ─────────────────────────────────
   `products` is read with `schemaValidation: false`, and rows written by an
   older build of the seller dashboard can be missing fields the declared type
   promises (`sizes`, `nameEn`, `description`, …). The storefront does
   `product.sizes.map(...)` in several places, so one malformed row was enough
   to blank the whole shop. `normalizeProductRow` guarantees the shape at the
   query boundary instead of guarding every render site. */

export const FALLBACK_PRODUCT_NAME = "Sản phẩm";

/** Is this one of the categories the storefront knows how to label? */
export function isCategory(value: unknown): value is Category {
  return (CATEGORIES as readonly unknown[]).includes(value);
}

export function normalizeCategory(value: unknown): Category {
  return isCategory(value) ? value : "tops";
}

/**
 * Repair a product row in place and return it (identity preserved, so React
 * keys and the Convex `_id` type are untouched).
 */
export function normalizeProductRow<T extends { _id: string }>(doc: T): T {
  const row = doc as unknown as Record<string, unknown>;

  const nameVi = typeof row.nameVi === "string" ? row.nameVi.trim() : "";
  const nameEn = typeof row.nameEn === "string" ? row.nameEn.trim() : "";
  row.nameVi = nameVi || nameEn || FALLBACK_PRODUCT_NAME;
  row.nameEn = nameEn || row.nameVi;

  row.category = normalizeCategory(row.category);
  row.price =
    typeof row.price === "number" && Number.isFinite(row.price)
      ? Math.max(0, row.price)
      : 0;

  row.sizes = Array.isArray(row.sizes)
    ? row.sizes.filter((size): size is string => typeof size === "string" && !!size.trim())
    : [];

  row.inStock = typeof row.inStock === "boolean" ? row.inStock : true;

  if (typeof row.description !== "string" || !row.description.trim()) {
    delete row.description;
  }
  if (typeof row.stock !== "number" || !Number.isFinite(row.stock)) {
    delete row.stock;
  }
  if (typeof row.createdAt !== "number" || !Number.isFinite(row.createdAt)) {
    row.createdAt = 0;
  }
  return doc;
}
