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
} as const;

/** Shop contact details.
 *
 *  Single source of truth so the header, the footer and the checkout can never
 *  disagree about how a customer reaches the shop. A COD shop selling lingerie
 *  really needs a number people can call: the customer will not hand money to
 *  a courier for an item they have not been able to ask a question about first.
 *
 *  Replace `phone` with the shop's real Zalo/mobile number before launch. */
export const CONTACT = {
  /** Human-readable, exactly as it should be shown and dialled. */
  phone: "0909 123 456",
  /** Tel: target — spaces stripped so the link actually works on mobile. */
  phoneHref: "tel:0909123456",
  /** Shop address shown in the footer. */
  address: "Diên Khánh, Khánh Hoà",
} as const;

/** Vietnamese category labels — locked. */
export const CATEGORY_LABELS_VI = {
  tops: "Áo Lót & Bra",
  dresses: "Quần Trong",
  cardigans: "Set Bộ Đồ Lót",
  trousers: "Mỹ Phẩm & Chăm Sóc Da",
  bestsellers: "Những mặt hàng bán chạy nhất",
} as const;
