import type { RawExtraction, ClusteredRadii } from "@stylescan/types";

function parsePx(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function inferRadiusToken(value: number): string {
  if (value >= 9999) return "--radius-full";
  if (value >= 12) return "--radius-xl";
  if (value >= 8) return "--radius-lg";
  if (value >= 6) return "--radius-md";
  if (value >= 4) return "--radius-sm";
  return "--radius-xs";
}

function inferRadiusUsage(value: number): string {
  if (value >= 9999) return "Pills, avatars";
  if (value >= 12) return "Modals, large surfaces";
  if (value >= 8) return "Cards";
  if (value >= 6) return "Buttons, inputs";
  if (value >= 4) return "Tags, small badges";
  return "Subtle rounding";
}

export function clusterRadii(extraction: RawExtraction): ClusteredRadii {
  const radiusMap = new Map<number, number>();

  for (const el of extraction.elements) {
    const br = el.styles["border-radius"];
    if (!br || br === "0px") continue;

    // Take the first value (border-radius can be shorthand)
    const value = parsePx(br.split(/\s+/)[0]);
    if (value > 0) {
      radiusMap.set(value, (radiusMap.get(value) ?? 0) + 1);
    }
  }

  // Sort by value, dedupe nearby values
  const entries = Array.from(radiusMap.entries()).sort((a, b) => a[0] - b[0]);
  const deduped: { value: number; count: number }[] = [];

  for (const [value, count] of entries) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.value - value) <= 1) {
      if (count > last.count) {
        last.value = value;
        last.count += count;
      }
    } else {
      deduped.push({ value, count });
    }
  }

  return {
    values: deduped.map((d) => ({
      token: inferRadiusToken(d.value),
      value: d.value >= 9999 ? "9999px" : `${d.value}px`,
      usage: inferRadiusUsage(d.value),
    })),
  };
}
