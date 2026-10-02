/**
 * LOCKED STORE COPY — single source of truth for static Vietnamese text.
 *
 * Everything in this file is hardcoded on purpose: these strings must never
 * be generated, translated, or reset by re-renders. UI components and the
 * i18n dictionaries import from here so the copy always stays identical.
 */

export const TEXT = {
  /** Desktop header title. */
  brandFull: "Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc.",
  /** Compact mobile header title. */
  brandMobile: "Shop Bảo Ngọc",
  /** Top announcement bar. */
  announce: "Miễn phí giao hàng cho đơn từ 400.000 VND.",
  /** 7-day size-exchange policy line. */
  policy7Day: "Hỗ trợ đổi trả Size trong vòng 7 ngày.",
  /** Location subtitle (footer / story). */
  locationTagline: "Shop Thời Trang Nữ uy tín hàng đầu tại Diên Khánh.",
  /** Shop area shown in the footer contact block. */
  locationArea: "Diên Khánh, Khánh Hoà",
} as const;

/** Shop contact details.
 *
 *  The shop's own area — not a personal contact. There is deliberately NO
 *  phone number in this file or anywhere else in the app: customers reach the
 *  shop through the live-chat widget, which the seller answers from their own
 *  account. Publishing a personal mobile number would put the owner's private
 *  line in the page source and in every customer's browser for no benefit.
 *
 *  A shared shop landline or a business Facebook page would be fine here. */

/** Vietnamese category labels — locked. */
export const CATEGORY_LABELS_VI = {
  tops: "Áo Lót & Bra",
  dresses: "Quần Trong",
  cardigans: "Set Bộ Đồ Lót",
  trousers: "Mỹ Phẩm & Chăm Sóc Da",
  bestsellers: "Những mặt hàng bán chạy nhất",
} as const;
