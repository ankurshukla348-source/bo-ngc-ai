/**
 * Order email content.
 *
 * Pure module (no React, no Convex, no Node APIs) so the exact HTML that goes
 * out can be unit-tested, and so nothing secret can reach the client bundle.
 * Both languages are written out in full rather than translated at send time,
 * matching how the rest of the site copy is handled.
 *
 * Privacy: an order email repeats the delivery *area* (ward, district,
 * province) but never the street address or phone number. The full address
 * stays in the order record, which the seller can erase once the parcel is
 * done — a receipt that outlived it would quietly undo that.
 */
import { type OrderStatus } from "./orders";

export const STORE_NAME = "Shop Thời Trang & Phụ Kiện Nữ Bảo Ngọc.";
export const STORE_AREA = "Diên Khánh, Khánh Hoà";

/** Standalone status labels for email, next to the UI labels in src/lib/i18n. */
export const ORDER_STATUS_LABELS_VI: Record<OrderStatus, string> = {
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  out_for_delivery: "Đang giao hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export const ORDER_STATUS_LABELS_EN: Record<OrderStatus, string> = {
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Escape user-authored copy before it is wrapped in the email HTML. */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailLang = "vi" | "en";

export type EmailOrder = {
  orderCode: string;
  createdAt: number;
  status: string;
  customer: { name: string; ward: string; district: string; province: string };
  items: {
    nameVi: string;
    nameEn: string;
    size: string;
    qty: number;
    price: number;
  }[];
  subtotal: number;
  shippingFee: number;
  total: number;
};

const money = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} đ`;

const stamp = (ts: number, lang: EmailLang) =>
  new Date(ts).toLocaleString(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function shell(title: string, rows: string[], lang: EmailLang): string {
  return [
    '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#2c1622;line-height:1.7">',
    `<h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(title)}</h1>`,
    `<p style="font-size:13px;color:#8a7a80;margin:0 0 18px">${escapeHtml(
      `${STORE_NAME} — ${STORE_AREA}`,
    )}</p>`,
    ...rows,
    '<hr style="border:none;border-top:1px solid #eadfe4;margin:24px 0" />',
    `<p style="font-size:12px;color:#8a7a80;margin:0">${escapeHtml(
      lang === "vi"
        ? "Cảm ơn quý khách đã ủng hộ shop!"
        : "Thank you for shopping with us!",
    )}</p>`,
    "</div>",
  ].join("");
}

function summaryRows(order: EmailOrder, lang: EmailLang): string[] {
  const items = order.items
    .map((item) => {
      const name = lang === "vi" ? item.nameVi : item.nameEn;
      return `<li style="margin:0 0 6px">${escapeHtml(name)} · ${escapeHtml(
        item.size,
      )} × ${item.qty} — <strong>${money(item.price * item.qty)}</strong></li>`;
    })
    .join("");

  const area = [
    order.customer.ward,
    order.customer.district,
    order.customer.province,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `<ul style="font-size:15px;margin:0 0 16px;padding-left:18px">${items}</ul>`,
    `<p style="font-size:15px;margin:0">${
      lang === "vi" ? "Tạm tính" : "Subtotal"
    }: ${money(order.subtotal)}</p>`,
    `<p style="font-size:15px;margin:0">${
      lang === "vi" ? "Phí giao hàng" : "Shipping"
    }: ${
      order.shippingFee === 0
        ? lang === "vi"
          ? "Miễn phí"
          : "Free"
        : money(order.shippingFee)
    }</p>`,
    `<p style="font-size:17px;margin:6px 0 16px"><strong>${
      lang === "vi" ? "Tổng cộng" : "Total"
    }: ${money(order.total)}</strong></p>`,
    `<p style="font-size:14px;margin:0 0 4px;color:#6b5a60">${
      lang === "vi" ? "Giao đến khu vực" : "Delivering to"
    }: ${escapeHtml(area)}</p>`,
    `<p style="font-size:14px;margin:0 0 16px;color:#6b5a60">${
      lang === "vi" ? "Thanh toán" : "Payment"
    }: ${
      lang === "vi" ? "Thanh toán khi nhận hàng (COD)" : "Cash on delivery"
    }</p>`,
  ];
}

export function orderReceiptEmail(
  order: EmailOrder,
  lang: EmailLang,
): { subject: string; html: string } {
  const title =
    lang === "vi"
      ? `Đơn hàng ${order.orderCode} đã được ghi nhận`
      : `Order ${order.orderCode} received`;
  return {
    subject: title,
    html: shell(
      title,
      [
        `<p style="font-size:15px;margin:0 0 4px">${escapeHtml(
          lang === "vi"
            ? `Chào ${order.customer.name}, shop đã nhận được đơn hàng của bạn.`
            : `Hi ${order.customer.name}, we have received your order.`,
        )}</p>`,
        `<p style="font-size:13px;color:#8a7a80;margin:0 0 16px">${escapeHtml(
          stamp(order.createdAt, lang),
        )}</p>`,
        ...summaryRows(order, lang),
        `<p style="font-size:14px;margin:0">${
          lang === "vi"
            ? "Shop sẽ gọi hoặc nhắn tin xác nhận trước khi giao. Bạn không cần thanh toán trước."
            : "The shop will call or message you to confirm before delivery. No prepayment is needed."
        }</p>`,
      ],
      lang,
    ),
  };
}

export function orderStatusEmail(
  order: EmailOrder,
  status: OrderStatus,
  lang: EmailLang,
): { subject: string; html: string } {
  const label =
    lang === "vi"
      ? ORDER_STATUS_LABELS_VI[status]
      : ORDER_STATUS_LABELS_EN[status];

  const note: Record<OrderStatus, { vi: string; en: string }> = {
    processing: {
      vi: "Shop đã nhận đơn và đang chuẩn bị hàng.",
      en: "We have your order and are preparing it.",
    },
    shipped: {
      vi: "Đơn hàng đã được gửi đi. Bạn có thể theo dõi trên trang Đơn hàng của tôi.",
      en: "Your order has shipped. You can follow it from My Orders.",
    },
    out_for_delivery: {
      vi: "Đơn hàng đang trên đường giao đến bạn.",
      en: "Your order is out for delivery.",
    },
    delivered: {
      vi: "Đơn hàng đã giao thành công. Cảm ơn bạn đã ủng hộ shop!",
      en: "Your order was delivered. Thank you for shopping with us!",
    },
    cancelled: {
      vi: "Đơn hàng đã được hủy. Shop sẽ liên hệ với bạn nếu cần.",
      en: "This order was cancelled. The shop will reach out if needed.",
    },
  };

  const title = `${order.orderCode} — ${label}`;
  return {
    subject: title,
    html: shell(
      title,
      [
        `<p style="font-size:15px;margin:0 0 16px">${escapeHtml(
          note[status][lang],
        )}</p>`,
        // A cancelled order has nothing left to deliver, so it gets no summary.
        ...(status === "cancelled" ? [] : summaryRows(order, lang)),
      ],
      lang,
    ),
  };
}
