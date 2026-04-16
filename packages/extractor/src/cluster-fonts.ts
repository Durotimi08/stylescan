import type { RawExtraction, ClusteredTypography } from "@stylescan/types";

interface FontSizeEntry {
  size: number;
  weight: number;
  lineHeight: string;
  letterSpacing: string;
  count: number;
  sampleTag: string;
}

function parsePx(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function inferUsage(size: number, tag: string): string {
  if (tag === "h1" || size >= 48) return "H1, hero";
  if (tag === "h2" || size >= 32) return "H2";
  if (tag === "h3" || size >= 24) return "H3";
  if (size >= 18) return "Sub-headings";
  if (size >= 15) return "Body";
  if (size >= 13) return "Body small, UI default";
  return "Labels, captions";
}

function inferToken(size: number): string {
  if (size >= 64) return "--text-display";
  if (size >= 48) return "--text-3xl";
  if (size >= 32) return "--text-2xl";
  if (size >= 24) return "--text-xl";
  if (size >= 18) return "--text-lg";
  if (size >= 15) return "--text-base";
  if (size >= 13) return "--text-sm";
  return "--text-xs";
}

function extractPrimaryFontFamily(elements: RawExtraction["elements"]): string {
  const families = new Map<string, number>();

  for (const el of elements) {
    const family = el.styles["font-family"];
    if (!family) continue;
    // Take the first font in the stack
    const primary = family.split(",")[0].trim().replace(/['"]/g, "");
    families.set(primary, (families.get(primary) ?? 0) + 1);
  }

  let topFamily = "sans-serif";
  let topCount = 0;
  for (const [family, count] of families) {
    if (count > topCount) {
      topCount = count;
      topFamily = family;
    }
  }
  return topFamily;
}

function findMonoFont(elements: RawExtraction["elements"]): string | null {
  const monoKeywords = [
    "mono",
    "code",
    "consolas",
    "menlo",
    "courier",
    "jetbrains",
    "fira code",
    "berkeley",
  ];

  for (const el of elements) {
    const family = el.styles["font-family"]?.toLowerCase() ?? "";
    if (monoKeywords.some((k) => family.includes(k))) {
      return el.styles["font-family"].split(",")[0].trim().replace(/['"]/g, "");
    }
  }
  return null;
}

export function clusterFonts(extraction: RawExtraction): ClusteredTypography {
  const sizeMap = new Map<number, FontSizeEntry>();

  for (const el of extraction.elements) {
    const sizeStr = el.styles["font-size"];
    if (!sizeStr) continue;

    const size = Math.round(parsePx(sizeStr));
    if (size === 0) continue;

    const existing = sizeMap.get(size);
    if (existing) {
      existing.count++;
    } else {
      sizeMap.set(size, {
        size,
        weight: parseInt(el.styles["font-weight"] ?? "400", 10) || 400,
        lineHeight: el.styles["line-height"] ?? `${Math.round(size * 1.5)}px`,
        letterSpacing: el.styles["letter-spacing"] ?? "0",
        count: 1,
        sampleTag: el.tag,
      });
    }
  }

  // Sort by size, dedupe nearby sizes (within 1px)
  const sizes = Array.from(sizeMap.values()).sort((a, b) => a.size - b.size);
  const deduped: FontSizeEntry[] = [];
  for (const entry of sizes) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.size - entry.size) <= 1) {
      if (entry.count > last.count) {
        deduped[deduped.length - 1] = entry;
      }
    } else {
      deduped.push(entry);
    }
  }

  const uiFont = extractPrimaryFontFamily(extraction.elements);
  const monoFont = findMonoFont(extraction.elements);

  return {
    fontStack: {
      ui: `"${uiFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
      mono: monoFont
        ? `"${monoFont}", Menlo, monospace`
        : '"JetBrains Mono", Menlo, monospace',
      display: null,
    },
    scale: deduped.map((entry) => ({
      token: inferToken(entry.size),
      size: `${entry.size}px`,
      lineHeight: entry.lineHeight,
      weight: entry.weight,
      letterSpacing:
        entry.letterSpacing !== "normal" && entry.letterSpacing !== "0"
          ? entry.letterSpacing
          : null,
      usage: inferUsage(entry.size, entry.sampleTag),
    })),
  };
}
