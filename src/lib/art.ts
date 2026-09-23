/** Flat, on-brand SVG placeholder artwork for products without a photo.
 * Pure module — used by both the client and Convex seed data. */

const PALETTES = [
  { bg: "#EFECE6", block: "#E4552E", ink: "#1A1A1A" },
  { bg: "#E7E0D2", block: "#1A1A1A", ink: "#1A1A1A" },
  { bg: "#FDFBF7", block: "#C8B69B", ink: "#1A1A1A" },
  { bg: "#DED6C4", block: "#4A5D4E", ink: "#1A1A1A" },
  { bg: "#EFECE6", block: "#1A1A1A", accent: "#E4552E", ink: "#1A1A1A" },
  { bg: "#E4552E", block: "#FDFBF7", ink: "#1A1A1A" },
];

/** Two-letter ASCII monogram from a product name. */
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

/** Abstract flat-block composition used as a product image fallback. */
export function placeholderArt(name: string, variant = 0): string {
  const p = PALETTES[variant % PALETTES.length]!;
  const layout = variant % 4;
  const mono = monogram(name);

  const compositions: Record<number, string> = {
    0: `
      <circle cx="545" cy="340" r="205" fill="${p.block}"/>
      <rect x="70" y="600" width="430" height="34" fill="${p.ink}"/>
      <rect x="70" y="664" width="300" height="34" fill="${p.ink}"/>
      <rect x="70" y="728" width="170" height="34" fill="${p.ink}"/>`,
    1: `
      <rect x="0" y="0" width="800" height="470" fill="${p.block}"/>
      <rect x="70" y="120" width="360" height="360" fill="${p.bg}" stroke="${p.ink}" stroke-width="6"/>
      <rect x="480" y="560" width="250" height="250" fill="${p.ink}"/>`,
    2: `
      <rect x="90" y="120" width="620" height="480" fill="${p.block}"/>
      <rect x="90" y="120" width="620" height="480" fill="none" stroke="${p.ink}" stroke-width="6"/>
      <rect x="150" y="660" width="500" height="26" fill="${p.ink}"/>
      <rect x="150" y="712" width="330" height="26" fill="${p.ink}"/>`,
    3: `
      <polygon points="400,90 700,380 400,670 100,380" fill="${p.block}"/>
      <rect x="90" y="740" width="620" height="30" fill="${p.ink}"/>
      <rect x="90" y="796" width="400" height="30" fill="${p.ink}"/>`,
  };

  const accent =
    "accent" in p && p.accent
      ? `<rect x="600" y="760" width="110" height="110" fill="${p.accent}" stroke="${p.ink}" stroke-width="6"/>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${p.bg}"/>
  ${compositions[layout]}
  ${accent}
  <rect x="22" y="22" width="756" height="956" fill="none" stroke="#1A1A1A" stroke-width="6"/>
  <text x="70" y="130" font-family="Georgia, 'Times New Roman', serif" font-size="118" font-weight="bold" fill="${p.ink}">${mono}</text>
  <text x="70" y="944" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-style="italic" fill="${p.ink}">MAMA &amp; CO.</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, " "))}`;
}
