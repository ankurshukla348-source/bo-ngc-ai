/** VietQR EMVCo payload builder.
 *
 * v1 decision: display-only bank transfer QR — no payment processor.
 * The payload is generated locally (no third-party API) and rendered
 * as a QR code; the customer transfers the exact amount via their bank app.
 */

export type BankDetails = {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
};

/** EMV tag-length-value pair. */
function tlv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, "0") + value;
}

/** Strip Vietnamese diacritics and anything not valid for a VietQR payload. */
function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, "")
    .trim()
    .slice(0, maxLength);
}

/** CRC16-CCITT (0xFFFF, poly 0x1021) as required by EMVCo field 63. */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Build a scan-ready VietQR payload string.
 * `reference` (e.g. the order ID) lands in field 62 so the seller can match
 * incoming transfers to orders.
 */
export function buildVietqrPayload({
  bankBin,
  accountNo,
  accountHolder,
  bankName,
  merchant = "MAMA AND CO SHOP BAO NGOC",
  city = "HA NOI",
  amount,
  reference,
}: BankDetails & { merchant?: string; city?: string; amount?: number; reference?: string }): string {
  const merchantAccountInfo =
    tlv("00", "A000000727") +
    tlv("01", sanitize(bankBin, 16)) +
    tlv("02", sanitize(accountNo, 32));

  const fields =
    tlv("00", "01") + // payload format indicator
    tlv("01", "12") + // point-of-initiation: dynamic (amount embedded)
    tlv("38", merchantAccountInfo) +
    tlv("59", sanitize(merchant, 25)) +
    tlv("60", sanitize(city, 15)) +
    tlv("53", "704") + // currency: VND
    (amount && amount > 0 ? tlv("54", String(Math.round(amount))) : "") +
    tlv("58", "VN");

  const additional = reference
    ? tlv("62", tlv("01", sanitize(reference, 25)))
    : "";

  void accountHolder; // holder name is shown next to the QR, not embedded
  void bankName;

  const body = fields + additional + "6304";
  return body + crc16(body);
}
