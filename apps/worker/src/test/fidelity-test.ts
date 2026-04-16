import "dotenv/config";
import { chromium } from "playwright";
import OpenAI from "openai";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { buildRawFacts } from "@stylescan/extractor";
import { callVisionLLM, callSynthesisLLM, VISION_ANALYSIS_PROMPT, SYNTHESIS_PROMPT } from "@stylescan/distiller";
import { serializeDesignMd } from "@stylescan/schema";
import { crawlPage } from "../pipeline/crawler";
import { buildDesignTokens } from "../pipeline/tokens";

// ─── Config ───

const RESULTS_DIR = join(process.cwd(), "..", "..", "test-results");
const url = process.argv[2];

if (!url) {
  console.error("Usage: tsx src/test/fidelity-test.ts <url>");
  console.error("Example: tsx src/test/fidelity-test.ts https://linear.app");
  process.exit(1);
}

// ─── Helpers ───

function log(step: string, detail?: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${step}${detail ? ` — ${detail}` : ""}`);
}

function slugify(u: string): string {
  return u.replace(/https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/_$/, "");
}

async function screenshotHtml(html: string, outPath: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  writeFileSync(outPath, buf);
  await browser.close();
  return buf;
}

// ─── Main ───

async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = slugify(url);
  const scanDir = join(RESULTS_DIR, `${slug}_${timestamp}`);
  mkdirSync(scanDir, { recursive: true });

  log("START", `Testing fidelity for ${url}`);
  log("OUTPUT", scanDir);

  // ─── Step 1: Crawl the original site ───
  log("STEP 1", "Crawling original site");
  const t1 = Date.now();
  const { extraction, screenshotUrl } = await crawlPage(url);
  log("STEP 1", `Crawled in ${Date.now() - t1}ms — ${extraction.elements.length} elements`);

  // Save original screenshot
  const originalBase64 = screenshotUrl.replace("data:image/png;base64,", "");
  const originalPng = Buffer.from(originalBase64, "base64");
  writeFileSync(join(scanDir, "01_original.png"), originalPng);
  log("STEP 1", "Saved 01_original.png");

  // ─── Step 2: Run the extraction pipeline ───
  log("STEP 2", "Clustering raw facts");
  const rawFacts = buildRawFacts(extraction);
  log("STEP 2", `${rawFacts.colors.raw.length} colors, ${rawFacts.typography.scale.length} type sizes`);
  writeFileSync(join(scanDir, "02_raw_facts.json"), JSON.stringify(rawFacts, null, 2));

  // ─── Step 3: Vision LLM ───
  log("STEP 3", "Running vision analysis");
  const t3 = Date.now();
  const aestheticAnalysis = await callVisionLLM({
    screenshotUrl,
    rawFacts,
    prompt: VISION_ANALYSIS_PROMPT,
  });
  log("STEP 3", `Done in ${Date.now() - t3}ms — "${aestheticAnalysis.one_line_summary}"`);
  writeFileSync(join(scanDir, "03_aesthetic_analysis.json"), JSON.stringify(aestheticAnalysis, null, 2));

  // ─── Step 4: Synthesis LLM ───
  log("STEP 4", "Running design.md synthesis");
  const t4 = Date.now();
  const designMdData = await callSynthesisLLM({
    rawFacts,
    aestheticAnalysis,
    prompt: SYNTHESIS_PROMPT,
  });
  const designMd = serializeDesignMd(designMdData);
  log("STEP 4", `Done in ${Date.now() - t4}ms — ${designMd.split("\n").length} lines`);
  writeFileSync(join(scanDir, "04_design.md"), designMd);

  // Save tokens
  const tokensJson = buildDesignTokens(rawFacts, designMdData);
  writeFileSync(join(scanDir, "04_tokens.json"), JSON.stringify(tokensJson, null, 2));

  // ─── Step 5: Generate a page using ONLY the design.md (no screenshot — that would be cheating) ───
  log("STEP 5", "Asking GPT-4o to build an education website using only the design.md");
  const openai = new OpenAI();
  const t5 = Date.now();

  const genResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16384,
    messages: [
      {
        role: "system",
        content: `You are a frontend developer. You have a design.md specification that defines a visual design system — colors, typography, spacing, component patterns, motion, and anti-patterns.

Your job: build a landing page for an ONLINE EDUCATION PLATFORM called "LearnPath" using this design system. The page content has NOTHING to do with the original site the design was extracted from — you are only borrowing the visual style.

Generate a SINGLE self-contained HTML file with inline <style>.

Page structure:
- Navigation bar with logo "LearnPath" and 4 links (Courses, Pricing, About, Sign In)
- Hero section with a large heading, subtitle about online learning, and a CTA button ("Start Learning Free")
- Features grid (3 columns): "Expert Instructors", "Self-Paced Learning", "Certificates"
- Testimonials or stats section
- Footer with links and copyright

Rules:
- Output ONLY the HTML. No explanation, no markdown fences.
- Use the EXACT hex colors from the design.md palette. Define them as CSS custom properties.
- Follow the typography scale exactly — sizes, weights, line-heights, letter-spacing.
- Use the spacing scale for all margins and padding. No arbitrary values.
- Style buttons, cards, and nav exactly as described in the Component Patterns section.
- Respect every anti-pattern listed — these are hard constraints.
- The page must feel like it belongs to the same visual family as the design system, just with different content.
- Make it responsive, visually complete, and production-quality.`,
      },
      {
        role: "user",
        content: `Here is the design.md specification. Build the LearnPath education landing page using this design system:\n\n${designMd}`,
      },
    ],
  });

  let generatedHtml = genResponse.choices[0]?.message?.content ?? "";
  // Strip markdown fences if present
  generatedHtml = generatedHtml.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "");
  log("STEP 5", `Generated in ${Date.now() - t5}ms — ${generatedHtml.length} chars`);
  writeFileSync(join(scanDir, "05_generated.html"), generatedHtml);

  // ─── Step 6: Screenshot the generated page ───
  log("STEP 6", "Screenshotting generated page");
  await screenshotHtml(generatedHtml, join(scanDir, "06_generated.png"));
  log("STEP 6", "Saved 06_generated.png");

  // ─── Step 7: Visual comparison via GPT-4o ───
  log("STEP 7", "Comparing original vs generated via GPT-4o vision");
  const generatedPng = readFileSync(join(scanDir, "06_generated.png"));
  const generatedBase64 = generatedPng.toString("base64");
  const t7 = Date.now();

  const compareResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a design system QA reviewer. You are evaluating whether a DESIGN LANGUAGE was successfully transferred from one website to another.

Image 1 is the ORIGINAL website (the source of the design language).
Image 2 is a DIFFERENT website (an education platform) that was built using a design.md specification extracted from the original.

IMPORTANT: The two sites have COMPLETELY DIFFERENT content and purpose. You are NOT judging content similarity. You are judging whether they share the same VISUAL DNA:

Evaluate these dimensions (score each 1-10):

1. **Color palette match** — Does the new site use the same background, text, and accent colors? Same dark/light mode? Same color relationships?
2. **Typography feel** — Similar font sizes, weights, hierarchy? Same typographic rhythm and density?
3. **Spacing & density** — Similar whitespace, padding, margins? Same visual breathing room?
4. **Component styling** — Do buttons, cards, nav bars share the same styling approach (radius, shadows, borders, hover states)?
5. **Overall aesthetic** — If you squinted, would these sites feel like they come from the same design team? Same visual era and mood?

Then provide:
- **Overall score** (1-10, weighted average)
- **Top 3 differences** (where the design language transfer failed)
- **Top 3 matches** (where the design DNA was captured well)
- **Verdict**: "PASS" (score >= 7), "PARTIAL" (5-6), or "FAIL" (< 5)

Return as JSON:
{
  "scores": { "color": N, "typography": N, "layout": N, "components": N, "feel": N },
  "overall": N,
  "differences": ["...", "...", "..."],
  "matches": ["...", "...", "..."],
  "verdict": "PASS|PARTIAL|FAIL",
  "notes": "brief overall assessment of design language transfer quality"
}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${originalBase64}` },
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${generatedBase64}` },
          },
        ],
      },
    ],
  });

  const compareText = compareResponse.choices[0]?.message?.content ?? "";
  log("STEP 7", `Comparison done in ${Date.now() - t7}ms`);

  // Parse the comparison
  let comparison: any;
  try {
    const jsonMatch = compareText.match(/\{[\s\S]*\}/);
    comparison = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: compareText };
  } catch {
    comparison = { raw: compareText };
  }

  writeFileSync(join(scanDir, "07_comparison.json"), JSON.stringify(comparison, null, 2));

  // ─── Step 8: Write summary ───
  const summary = `# Fidelity Test Report

**URL:** ${url}
**Date:** ${new Date().toISOString()}
**Scan directory:** ${scanDir}

## Scores

| Dimension | Score |
|---|---|
| Color accuracy | ${comparison.scores?.color ?? "?"}/10 |
| Typography | ${comparison.scores?.typography ?? "?"}/10 |
| Layout & spacing | ${comparison.scores?.layout ?? "?"}/10 |
| Component fidelity | ${comparison.scores?.components ?? "?"}/10 |
| Overall feel | ${comparison.scores?.feel ?? "?"}/10 |
| **Overall** | **${comparison.overall ?? "?"}/10** |

## Verdict: ${comparison.verdict ?? "UNKNOWN"}

${comparison.notes ?? ""}

## Top differences
${(comparison.differences ?? []).map((d: string) => `- ${d}`).join("\n")}

## Top matches
${(comparison.matches ?? []).map((m: string) => `- ${m}`).join("\n")}

## Pipeline stats
- Elements extracted: ${extraction.elements.length}
- Colors clustered: ${rawFacts.colors.raw.length}
- Type sizes: ${rawFacts.typography.scale.length}
- Anti-patterns: ${designMdData.antipatterns.length}
- design.md lines: ${designMd.split("\n").length}
- Generated HTML: ${generatedHtml.length} chars

## Files
- \`01_original.png\` — Original website screenshot
- \`02_raw_facts.json\` — Clustered extraction data
- \`03_aesthetic_analysis.json\` — Vision LLM analysis
- \`04_design.md\` — Generated design specification
- \`04_tokens.json\` — W3C design tokens
- \`05_generated.html\` — HTML page built from design.md
- \`06_generated.png\` — Screenshot of generated page
- \`07_comparison.json\` — Visual comparison scores
`;

  writeFileSync(join(scanDir, "08_summary.md"), summary);

  // ─── Done ───
  console.log("\n" + "=".repeat(60));
  console.log(`FIDELITY TEST COMPLETE`);
  console.log(`URL:     ${url}`);
  console.log(`Verdict: ${comparison.verdict ?? "UNKNOWN"}`);
  console.log(`Score:   ${comparison.overall ?? "?"}/10`);
  console.log(`Output:  ${scanDir}`);
  console.log("=".repeat(60));

  if (comparison.scores) {
    console.log(`  Color:      ${comparison.scores.color}/10`);
    console.log(`  Typography: ${comparison.scores.typography}/10`);
    console.log(`  Layout:     ${comparison.scores.layout}/10`);
    console.log(`  Components: ${comparison.scores.components}/10`);
    console.log(`  Feel:       ${comparison.scores.feel}/10`);
  }

  if (comparison.differences?.length) {
    console.log(`\nTop differences:`);
    comparison.differences.forEach((d: string) => console.log(`  - ${d}`));
  }

  console.log(`\nFiles saved to: ${scanDir}`);
}

run().catch((err) => {
  console.error("Fidelity test failed:", err);
  process.exit(1);
});
