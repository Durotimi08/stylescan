import chroma from "chroma-js";
import type {
  RawExtraction,
  ClusteredColors,
  ClusteredColor,
} from "@stylescan/types";

interface ColorEntry {
  color: string;
  role: string;
  count: number;
}

function parseColor(raw: string): string | null {
  try {
    return chroma(raw).hex();
  } catch {
    return null;
  }
}

function inferRole(
  tag: string,
  classes: string[],
  type: "fg" | "bg"
): string {
  const classStr = classes.join(" ").toLowerCase();
  if (type === "bg") {
    if (tag === "body" || tag === "html") return "canvas";
    if (classStr.includes("card") || classStr.includes("surface"))
      return "surface";
    if (
      classStr.includes("modal") ||
      classStr.includes("overlay") ||
      classStr.includes("popover")
    )
      return "overlay";
    return "bg";
  }
  if (classStr.includes("muted") || classStr.includes("secondary"))
    return "fg-secondary";
  if (classStr.includes("disabled") || classStr.includes("placeholder"))
    return "fg-tertiary";
  return "fg-primary";
}

function mergeNearIdentical(
  colors: ColorEntry[],
  threshold: number
): ColorEntry[] {
  const merged: ColorEntry[] = [];
  const used = new Set<number>();

  for (let i = 0; i < colors.length; i++) {
    if (used.has(i)) continue;
    let entry = { ...colors[i] };
    for (let j = i + 1; j < colors.length; j++) {
      if (used.has(j)) continue;
      try {
        const delta = chroma.deltaE(entry.color, colors[j].color);
        if (delta < threshold) {
          entry.count += colors[j].count;
          used.add(j);
        }
      } catch {
        continue;
      }
    }
    merged.push(entry);
  }
  return merged;
}

function kMeansCluster(
  colors: ClusteredColor[],
  k: number
): ClusteredColor[] {
  if (colors.length <= k) return colors;

  // Sort by weight descending and take top k as initial centroids
  const sorted = [...colors].sort((a, b) => b.weight - a.weight);
  return sorted.slice(0, k);
}

function findByLuminance(
  colors: ClusteredColor[],
  target: "darkest" | "lightest" | "mid",
  exclude: Set<string> = new Set()
): string {
  const available = colors.filter((c) => !exclude.has(c.hex));
  if (available.length === 0) return colors[0]?.hex ?? "#000000";

  const withLum = available.map((c) => ({
    ...c,
    lum: chroma(c.hex).luminance(),
  }));

  if (target === "darkest") {
    withLum.sort((a, b) => a.lum - b.lum);
  } else if (target === "lightest") {
    withLum.sort((a, b) => b.lum - a.lum);
  } else {
    withLum.sort((a, b) => Math.abs(a.lum - 0.5) - Math.abs(b.lum - 0.5));
  }

  return withLum[0].hex;
}

function findMostSaturated(
  colors: ClusteredColor[],
  exclude: Set<string> = new Set()
): string {
  const available = colors.filter((c) => !exclude.has(c.hex));
  if (available.length === 0) return "#5E6AD2";

  const withSat = available.map((c) => ({
    ...c,
    sat: chroma(c.hex).lch()[1], // chroma (colorfulness)
  }));

  withSat.sort((a, b) => b.sat - a.sat);
  return withSat[0].hex;
}

export function clusterColors(extraction: RawExtraction): ClusteredColors {
  const rawColors: ColorEntry[] = [];

  for (const el of extraction.elements) {
    const fg = el.styles.color;
    const bg = el.styles["background-color"];

    if (fg && fg !== "rgba(0, 0, 0, 0)") {
      const hex = parseColor(fg);
      if (hex) {
        const existing = rawColors.find(
          (c) => c.color === hex && c.role === inferRole(el.tag, el.classes, "fg")
        );
        if (existing) {
          existing.count++;
        } else {
          rawColors.push({
            color: hex,
            role: inferRole(el.tag, el.classes, "fg"),
            count: 1,
          });
        }
      }
    }

    if (bg && bg !== "rgba(0, 0, 0, 0)") {
      const hex = parseColor(bg);
      if (hex) {
        const existing = rawColors.find(
          (c) => c.color === hex && c.role === inferRole(el.tag, el.classes, "bg")
        );
        if (existing) {
          existing.count++;
        } else {
          rawColors.push({
            color: hex,
            role: inferRole(el.tag, el.classes, "bg"),
            count: 1,
          });
        }
      }
    }
  }

  const merged = mergeNearIdentical(rawColors, 2);

  const weighted: ClusteredColor[] = merged.map((c) => ({
    hex: c.color,
    role: c.role,
    count: c.count,
    weight: c.count,
  }));

  const palette = kMeansCluster(weighted, 12);
  const usedColors = new Set<string>();

  const canvas = findByLuminance(palette, "darkest");
  usedColors.add(canvas);

  const surface = findByLuminance(palette, "darkest", usedColors);
  usedColors.add(surface);

  const overlay = findByLuminance(palette, "darkest", usedColors);
  usedColors.add(overlay);

  const fgPrimary = findByLuminance(palette, "lightest");
  usedColors.add(fgPrimary);

  const fgSecondary = findByLuminance(palette, "mid", usedColors);
  usedColors.add(fgSecondary);

  const fgTertiary = findByLuminance(palette, "mid", usedColors);
  usedColors.add(fgTertiary);

  const accent = findMostSaturated(palette, usedColors);
  usedColors.add(accent);

  let accentHover: string;
  try {
    accentHover = chroma(accent).brighten(0.5).hex();
  } catch {
    accentHover = accent;
  }

  const borderSubtle = findByLuminance(palette, "darkest", usedColors);
  usedColors.add(borderSubtle);

  let borderStrong: string;
  try {
    borderStrong = chroma(borderSubtle).brighten(0.3).hex();
  } catch {
    borderStrong = borderSubtle;
  }

  return {
    canvas,
    surface,
    overlay,
    fgPrimary,
    fgSecondary,
    fgTertiary,
    accent,
    accentHover,
    borderSubtle,
    borderStrong,
    success: null,
    warning: null,
    error: null,
    raw: weighted,
  };
}
