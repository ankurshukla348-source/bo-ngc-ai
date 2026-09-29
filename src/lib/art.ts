/** Real-product-photo fallback for products without an uploaded photo.
 * Pure module — used by both the client and Convex seed data.
 *
 * The previous flat geometric SVG blocks (circles/diamonds/monogram panels)
 * are replaced by curated, on-brand stock photography: lingerie, women's
 * apparel and beauty/skincare shots. Every URL below was verified to return
 * HTTP 200 image/jpeg from images.pexels.com (Pexels license: free to use).
 */

const PHOTOS = [
  // Black brassiere & makeup flat lay on bed
  "https://images.pexels.com/photos/4314754/pexels-photo-4314754.jpeg?auto=compress&cs=tinysrgb&w=900",
  // Assorted lingerie flat lay on wood
  "https://images.pexels.com/photos/3993401/pexels-photo-3993401.jpeg?auto=compress&cs=tinysrgb&w=900",
  // Serum dropper close-up (beauty)
  "https://images.pexels.com/photos/3762882/pexels-photo-3762882.jpeg?auto=compress&cs=tinysrgb&w=900",
  // Skincare bottles still-life
  "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=900",
  // Apparel / bra flat lay, soft tones
  "https://images.pexels.com/photos/3735619/pexels-photo-3735619.jpeg?auto=compress&cs=tinysrgb&w=900",
  // Beauty products, warm light
  "https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg?auto=compress&cs=tinysrgb&w=900",
] as const;

/** Deterministic photo pick so a given product always shows the same image. */
export function placeholderArt(name: string, variant = 0): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const idx = (Math.abs(hash) + variant) % PHOTOS.length;
  return PHOTOS[idx]!;
}

/** Two-letter ASCII monogram from a product name (kept for the card
 * fallback badge; no longer used for generated artwork). */
export function monogram(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return letters || "BN";
}
