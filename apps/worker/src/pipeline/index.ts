import type { ScanJob, RawFacts, RawExtraction, DesignTokens, ComponentPattern } from "@stylescan/types";
import { buildRawFacts } from "@stylescan/extractor";
import { callVisionLLM, callSynthesisLLM, VISION_ANALYSIS_PROMPT, SYNTHESIS_PROMPT } from "@stylescan/distiller";
import { serializeDesignMd, validateDesignMd } from "@stylescan/schema";
import { crawlPage } from "./crawler";
import { buildDesignTokens } from "./tokens";

export interface PipelineResult {
  designMd: string;
  tokensJson: DesignTokens;
  componentsJson: ComponentPattern[];
  rawFacts: RawFacts;
  confidence: number;
}

function log(scanId: string, step: string, detail?: string) {
  const ts = new Date().toISOString().slice(11, 23);
  const msg = detail ? `${step} — ${detail}` : step;
  console.log(`[${ts}] [${scanId}] ${msg}`);
}

export async function runScanPipeline(job: ScanJob): Promise<PipelineResult> {
  const id = job.scanId.slice(0, 8);
  let extraction: RawExtraction;
  let screenshotUrl: string;

  if (job.extraction) {
    log(id, "EXTRACT", "Using extension-provided extraction");
    extraction = job.extraction;
    screenshotUrl = job.screenshotUrl;
    log(id, "EXTRACT", `${extraction.elements.length} elements, ${extraction.fonts.length} fonts`);
  } else {
    log(id, "CRAWL", `Launching Playwright for ${job.sourceUrl}`);
    const t0 = Date.now();
    const crawlResult = await crawlPage(job.sourceUrl);
    extraction = crawlResult.extraction;
    screenshotUrl = crawlResult.screenshotUrl;
    log(id, "CRAWL", `Done in ${Date.now() - t0}ms — ${extraction.elements.length} elements, screenshot ${Math.round(screenshotUrl.length / 1024)}KB`);
  }

  // Step 1: Deterministic clustering
  log(id, "CLUSTER", "Running color/font/spacing/radii/shadow clustering");
  const t1 = Date.now();
  const rawFacts = buildRawFacts(extraction);
  log(id, "CLUSTER", `Done in ${Date.now() - t1}ms — ${rawFacts.colors.raw.length} colors, ${rawFacts.typography.scale.length} type sizes, ${rawFacts.shadows.length} shadows, ${rawFacts.componentGuesses.length} components`);

  // Step 2: Vision LLM
  log(id, "VISION", "Calling GPT-4o vision analysis");
  const t2 = Date.now();
  const aestheticAnalysis = await callVisionLLM({
    screenshotUrl,
    rawFacts,
    prompt: VISION_ANALYSIS_PROMPT,
  });
  log(id, "VISION", `Done in ${Date.now() - t2}ms — mood: ${aestheticAnalysis.color_mood}, density: ${aestheticAnalysis.density}, confidence: ${aestheticAnalysis.confidence}`);
  log(id, "VISION", `Keywords: [${aestheticAnalysis.style_keywords.join(", ")}]`);
  log(id, "VISION", `Summary: "${aestheticAnalysis.one_line_summary}"`);

  // Step 3: Synthesis LLM
  log(id, "SYNTHESIS", "Calling GPT-4o design.md synthesis");
  const t3 = Date.now();
  const designMdData = await callSynthesisLLM({
    rawFacts,
    aestheticAnalysis,
    prompt: SYNTHESIS_PROMPT,
  });
  log(id, "SYNTHESIS", `Done in ${Date.now() - t3}ms — ${designMdData.colors.palette.length} colors, ${designMdData.typography.scale.length} type sizes, ${designMdData.antipatterns.length} anti-patterns, ${designMdData.components.length} components`);

  // Step 4: Serialize
  const designMd = serializeDesignMd(designMdData);
  log(id, "SERIALIZE", `design.md: ${designMd.split("\n").length} lines, ${Math.round(designMd.length / 1024)}KB`);

  // Step 5: Build tokens
  const tokensJson = buildDesignTokens(rawFacts, designMdData);
  log(id, "TOKENS", `tokens.json built`);

  // Step 6: Components
  const componentsJson = designMdData.components;
  log(id, "DONE", `Pipeline complete. Confidence: ${aestheticAnalysis.confidence}`);

  return {
    designMd,
    tokensJson,
    componentsJson,
    rawFacts,
    confidence: aestheticAnalysis.confidence,
  };
}
