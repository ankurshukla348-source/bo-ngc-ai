/**
 * Anti-spam limits shared by the public checkout, the chat widget and the
 * Convex functions that guard them.
 *
 * Pure module (no Convex imports) so the browser can show the same limits the
 * server enforces. The counting itself lives in the Convex functions, which
 * own the database.
 */

/** Honeypot field name — a hidden input a human never sees or fills. */
export const HONEYPOT_FIELD = "website";

export function isHoneypotTripped(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

/** Vietnamese phone numbers, normalised to 10 digits starting with 0. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("84")) {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 12 && digits.startsWith("084")) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export type Limit = { max: number; windowMs: number };

/** Max orders one phone number may place per hour.
 *
 *  Tuned for a real shop, not a test rig. The previous limit of 5/hours
 *  rejected genuine customers during any promotion: a family ordering several
 *  sizes, or two people sharing a phone (common in Vietnam), hit the ceiling
 *  and saw a bare "Too many orders from this phone number" with no way to
 *  tell it apart from spam blocking. A scraper cannot do meaningful damage at
 *  15 orders/hour from one number — each one still writes a row and sends the
 *  customer an email — so the extra headroom is cheap insurance against lost
 *  sales. Raise it further if a live sale ever trips it. */
export const ORDER_LIMIT: Limit = { max: 15, windowMs: 60 * 60 * 1000 };

/** Max lines one order may contain. */
export const MAX_ORDER_ITEMS = 20;

/** Max chat messages one visitor may send per thread per 10 minutes. */
export const CHAT_CUSTOMER_LIMIT: Limit = { max: 8, windowMs: 10 * 60 * 1000 };

/** Max chat messages a thread may carry in an hour, either side. */
export const CHAT_THREAD_LIMIT: Limit = { max: 40, windowMs: 60 * 60 * 1000 };

/** Max concurrent live-chat threads opened from one browser per hour. */
export const CHAT_OPEN_LIMIT: Limit = { max: 3, windowMs: 60 * 60 * 1000 };

/** Max newsletter sign-ups one address may make per hour.
 *
 *  The footer form is public and idempotent, so the only abuse worth stopping
 *  is a script re-submitting one address to bloat the list. Keyed by address
 *  rather than IP because Convex actions see no client IP. */
export const NEWSLETTER_LIMIT: Limit = { max: 5, windowMs: 60 * 60 * 1000 };

export const newsletterThrottleKey = (email: string) =>
  `news:${email.trim().toLowerCase()}`;

export const orderThrottleKey = (phone: string) => `order:${normalizePhone(phone)}`;
export const chatThrottleKey = (conversationId: string) => `chat:c:${conversationId}`;
export const chatSellerThrottleKey = (conversationId: string) => `chat:s:${conversationId}`;
export const threadThrottleKey = (conversationId: string) => `thread:${conversationId}`;
