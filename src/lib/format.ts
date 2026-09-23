const vndFormatter = new Intl.NumberFormat("vi-VN");

/** Format an amount in Vietnamese Dong: 685000 -> "685.000₫" */
export function formatVnd(amount: number): string {
  return `${vndFormatter.format(Math.round(amount))}₫`;
}

/** Digits only, for inputs that accept a VND price. */
export function sanitizePriceInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}
