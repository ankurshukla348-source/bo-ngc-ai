/** Store catalog constants shared by the client and Convex functions.
 * Keep this module pure (no React, no browser APIs). */

/** Store categories. The two former beauty sections were merged into the
 *  single "trousers" entry, which is labelled "Mỹ Phẩm & Chăm Sóc Da". */
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

/** Flat shipping fee in VND, waived above the threshold. */
export const SHIPPING_FEE = 30_000;
export const FREE_SHIPPING_THRESHOLD = 400_000;

export function shippingFeeFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
