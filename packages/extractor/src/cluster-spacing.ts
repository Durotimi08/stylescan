import type { RawExtraction, ClusteredSpacing, SpacingPattern } from "@stylescan/types";

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

function detectBase(values: number[]): number {
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

function inferContext(tag: string, classes: string[]): string {
  const cls = classes.join(" ").toLowerCase();
  if (tag === "nav" || cls.includes("nav") || cls.includes("header")) return "navigation";
  if (tag === "section" || cls.includes("section") || cls.includes("hero")) return "section";
  if (cls.includes("card") || cls.includes("tile")) return "card";
  if (tag === "button" || cls.includes("btn") || cls.includes("button")) return "button";
  if (tag === "li" || cls.includes("item")) return "list-item";
  if (tag === "footer" || cls.includes("footer")) return "footer";
  if (cls.includes("container") || cls.includes("wrapper")) return "container";
  if (cls.includes("grid") || cls.includes("flex")) return "layout";
  if (tag === "input" || tag === "textarea") return "input";
  if (tag === "h1" || tag === "h2" || tag === "h3") return "heading";
  if (tag === "p") return "paragraph";
  return "element";
}

export function clusterSpacing(extraction: RawExtraction): ClusteredSpacing {
  const allValues: number[] = [];
  const patternMap = new Map<string, SpacingPattern>();

  for (const el of extraction.elements) {
    const context = inferContext(el.tag, el.classes);

    for (const [prop, label] of [
      ["margin", "margin"],
      ["padding", "padding"],
      ["gap", "gap"],
    ] as const) {
      const raw = el.styles[prop];
      if (!raw || raw === "0px") continue;

      const values = parseSpacingValues(raw);
      allValues.push(...values);

      const key = `${context}:${label}:${raw}`;
      const existing = patternMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        patternMap.set(key, { context, property: label, value: raw, count: 1 });
      }
    }
  }

  const base = detectBase(allValues);

  const scale = [0, base, base * 2, base * 3, base * 4, base * 6, base * 8, base * 12, base * 16, base * 24, base * 32]
    .filter((v) => v <= 256);

  // Top patterns by frequency — tells the LLM how spacing is actually used
  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    base,
    scale: scale.length > 0 ? scale : [0, 4, 8, 16, 24, 32, 48, 64],
    patterns,
  };
}
