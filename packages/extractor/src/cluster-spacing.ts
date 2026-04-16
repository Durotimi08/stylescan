import type { RawExtraction, ClusteredSpacing } from "@stylescan/types";

function parsePx(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function parseSpacingValues(value: string): number[] {
  return value
    .split(/\s+/)
    .map(parsePx)
    .filter((v) => v > 0);
}

function snapToGrid(value: number, base: number): number {
  return Math.round(value / base) * base;
}

function detectBase(values: number[]): number {
  // Count multiples of 4 vs 8 vs 5
  const bases = [4, 8, 5, 6];
  let bestBase = 4;
  let bestScore = 0;

  for (const base of bases) {
    let score = 0;
    for (const v of values) {
      if (v % base === 0) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestBase = base;
    }
  }

  return bestBase;
}

export function clusterSpacing(extraction: RawExtraction): ClusteredSpacing {
  const allValues: number[] = [];

  for (const el of extraction.elements) {
    const margin = el.styles.margin;
    const padding = el.styles.padding;
    const gap = el.styles.gap;

    if (margin) allValues.push(...parseSpacingValues(margin));
    if (padding) allValues.push(...parseSpacingValues(padding));
    if (gap) allValues.push(...parseSpacingValues(gap));
  }

  const base = detectBase(allValues);

  // Snap all values to the base grid and count occurrences
  const histogram = new Map<number, number>();
  for (const v of allValues) {
    const snapped = snapToGrid(v, base);
    if (snapped > 0 && snapped <= 256) {
      histogram.set(snapped, (histogram.get(snapped) ?? 0) + 1);
    }
  }

  // Build a scale from the most common values
  const sorted = Array.from(histogram.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([value]) => value);

  // Ensure we have a reasonable scale (0 through ~128)
  const scale = [0, base, base * 2, base * 3, base * 4, base * 6, base * 8, base * 12, base * 16, base * 24, base * 32]
    .filter((v) => v <= 256);

  return {
    base,
    scale: scale.length > 0 ? scale : sorted.slice(0, 12),
  };
}
