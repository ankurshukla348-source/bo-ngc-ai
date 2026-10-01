const vndFormatter = new Intl.NumberFormat("vi-VN");

/** Format an amount in Vietnamese Dong: 685000 -> "685.000₫"
 *
 *  Tolerates a missing/NaN amount: a legacy order row without `total` used to
 *  render "NaN₫" in the order lists, and `Intl` throws on a non-number. */
export function formatVnd(amount: number | undefined | null): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "0₫";
  return `${vndFormatter.format(Math.round(amount))}₫`;
}

/** Digits only, for inputs that accept a VND price. */
export function sanitizePriceInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}
