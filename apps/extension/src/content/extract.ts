import type { RawExtraction, ElementSnapshot, FontInfo } from "@stylescan/types";

const RELEVANT_STYLE_PROPS = [
  "color",
  "background-color",
  "background-image",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "margin",
  "padding",
  "border",
  "border-radius",
  "box-shadow",
  "opacity",
  "display",
  "flex-direction",
  "gap",
  "grid-template-columns",
  "transition",
  "transform",
];

function serializeRelevantStyles(
  styles: CSSStyleDeclaration
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const prop of RELEVANT_STYLE_PROPS) {
    out[prop] = styles.getPropertyValue(prop);
  }
  return out;
}

function extractFonts(): FontInfo[] {
  const fonts: FontInfo[] = [];
  const seen = new Set<string>();

  const elements = document.querySelectorAll("*");
  for (const el of elements) {
    const styles = getComputedStyle(el);
    const family = styles.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
    if (family && !seen.has(family)) {
      seen.add(family);
      const weight = parseInt(styles.fontWeight, 10) || 400;

      // Detect source
      let source: FontInfo["source"] = "unknown";
      for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
        const href = link.getAttribute("href") ?? "";
        if (href.includes("fonts.googleapis.com")) {
          source = "google";
          break;
        }
      }

      fonts.push({ family, weights: [weight], source });
    }
  }

  return fonts;
}

function extractMediaQueries(): string[] {
  const queries: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSMediaRule && !queries.includes(rule.conditionText)) {
          queries.push(rule.conditionText);
        }
      }
    } catch {
      // CORS-protected stylesheet
    }
  }

  return queries;
}

export function extractRawData(): RawExtraction {
  const elements: ElementSnapshot[] = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const el = node as Element;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0)
          return NodeFilter.FILTER_REJECT;
        if (getComputedStyle(el).display === "none")
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as Element;
    const styles = getComputedStyle(el);
    elements.push({
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      role: el.getAttribute("role"),
      rect: el.getBoundingClientRect().toJSON(),
      styles: serializeRelevantStyles(styles),
      textContent: el.textContent?.slice(0, 120) ?? null,
    });
  }

  const rawCss: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules);
      rawCss.push(rules.map((r) => r.cssText).join("\n"));
    } catch {
      // CORS-protected sheet
    }
  }

  return {
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    elements,
    rawCss: rawCss.join("\n\n"),
    fonts: extractFonts(),
    mediaQueries: extractMediaQueries(),
    capturedAt: new Date().toISOString(),
  };
}
