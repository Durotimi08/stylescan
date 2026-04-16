import type { RawExtraction, ShadowEntry } from "@stylescan/types";

function categorizeShadow(shadow: string): string {
  // Rough heuristic based on blur radius
  const match = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/);
  if (!match) return "General shadow";

  const blur = parseInt(match[3], 10);
  if (blur <= 4) return "Subtle elevation, hover states";
  if (blur <= 16) return "Cards, dropdowns, moderate elevation";
  return "Modals, overlays, high elevation";
}

function inferToken(index: number, total: number): string {
  if (total <= 1) return "--shadow-md";
  if (index === 0) return "--shadow-sm";
  if (index === total - 1) return "--shadow-lg";
  return `--shadow-md`;
}

export function extractShadows(extraction: RawExtraction): ShadowEntry[] {
  const shadowMap = new Map<string, number>();

  for (const el of extraction.elements) {
    const shadow = el.styles["box-shadow"];
    if (!shadow || shadow === "none") continue;
    shadowMap.set(shadow, (shadowMap.get(shadow) ?? 0) + 1);
  }

  // Sort by frequency descending
  const sorted = Array.from(shadowMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sorted.map(([value], index) => ({
    token: inferToken(index, sorted.length),
    value,
    usage: categorizeShadow(value),
  }));
}
