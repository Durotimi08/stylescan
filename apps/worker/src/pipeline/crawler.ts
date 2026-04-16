import { chromium } from "playwright";
import type { RawExtraction } from "@stylescan/types";

export interface CrawlResult {
  extraction: RawExtraction;
  screenshotUrl: string;
}

// This script runs inside the browser via page.evaluate.
// It MUST be a plain string to avoid tsx/esbuild transformations leaking in.
const EXTRACT_SCRIPT = `(relevantProps) => {
  const elements = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        var el = node;
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT;
        if (getComputedStyle(el).display === 'none') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  var node;
  while ((node = walker.nextNode())) {
    var el = node;
    var styles = getComputedStyle(el);
    var styleObj = {};
    for (var i = 0; i < relevantProps.length; i++) {
      styleObj[relevantProps[i]] = styles.getPropertyValue(relevantProps[i]);
    }

    elements.push({
      tag: el.tagName.toLowerCase(),
      classes: Array.from(el.classList),
      role: el.getAttribute('role'),
      rect: el.getBoundingClientRect().toJSON(),
      styles: styleObj,
      textContent: el.textContent ? el.textContent.slice(0, 120) : null,
    });
  }

  var rawCss = [];
  var sheets = Array.from(document.styleSheets);
  for (var s = 0; s < sheets.length; s++) {
    try {
      var rules = Array.from(sheets[s].cssRules);
      rawCss.push(rules.map(function(r) { return r.cssText; }).join('\\n'));
    } catch(e) {}
  }

  var fonts = [];
  var seenFonts = {};
  for (var j = 0; j < elements.length; j++) {
    var fam = elements[j].styles['font-family'];
    if (fam) {
      var primary = fam.split(',')[0].trim().replace(/['"]/g, '');
      if (primary && !seenFonts[primary]) {
        seenFonts[primary] = true;
        fonts.push({
          family: primary,
          weights: [parseInt(elements[j].styles['font-weight'] || '400', 10)],
          source: 'unknown',
        });
      }
    }
  }

  var mediaQueries = [];
  for (var k = 0; k < sheets.length; k++) {
    try {
      var cssRules = Array.from(sheets[k].cssRules);
      for (var m = 0; m < cssRules.length; m++) {
        if (cssRules[m] instanceof CSSMediaRule) {
          var cond = cssRules[m].conditionText;
          if (mediaQueries.indexOf(cond) === -1) {
            mediaQueries.push(cond);
          }
        }
      }
    } catch(e) {}
  }

  return {
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    elements: elements,
    rawCss: rawCss.join('\\n\\n'),
    fonts: fonts,
    mediaQueries: mediaQueries,
    capturedAt: new Date().toISOString(),
  };
}`;

const RELEVANT_PROPS = [
  "color", "background-color", "background-image",
  "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
  "margin", "padding", "border", "border-radius",
  "box-shadow", "opacity", "display", "flex-direction", "gap",
  "grid-template-columns", "transition", "transform",
];

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[::1\])/i;

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${parsed.protocol}`);
  }
  if (BLOCKED_HOSTS.test(parsed.hostname)) {
    throw new Error(`Blocked internal URL: ${parsed.hostname}`);
  }
}

export async function crawlPage(url: string): Promise<CrawlResult> {
  validateUrl(url);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: "png" });
    const screenshotBase64 = screenshotBuffer.toString("base64");
    const screenshotUrl = `data:image/png;base64,${screenshotBase64}`;

    // Extract DOM — use eval() with a string to avoid tsx mangling the function
    const extractFn = new Function("return " + EXTRACT_SCRIPT)();
    const extraction = await page.evaluate(extractFn, RELEVANT_PROPS);

    return {
      extraction: extraction as RawExtraction,
      screenshotUrl,
    };
  } finally {
    await browser.close();
  }
}
