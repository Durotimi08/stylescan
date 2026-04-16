export const SYNTHESIS_PROMPT = `You are generating a design.md specification for an AI coding agent.

Inputs:
- RAW_FACTS: clustered colors, typography scale, spacing, components (JSON)
- AESTHETIC_ANALYSIS: detailed visual analysis including layout structure, exact colors from screenshot, and section descriptions (JSON)

CRITICAL: The AESTHETIC_ANALYSIS contains colors extracted directly from the screenshot by a vision model. These are MORE ACCURATE than RAW_FACTS colors. When they conflict:
- Use AESTHETIC_ANALYSIS.primary_cta_color for the main CTA/button accent
- Use AESTHETIC_ANALYSIS.background_color for the canvas
- Use AESTHETIC_ANALYSIS.accent_colors for accent tokens
- Use RAW_FACTS for typography, spacing, and radii (these are reliable from CSS)

Your task: produce a structured JSON object representing a design system specification.

The JSON object must conform to the following structure:

{
  "frontmatter": {
    "stylescan_version": "1.0",
    "source_url": string,
    "scanned_at": string (ISO 8601),
    "confidence": number (0-1),
    "pages_analyzed": number (optional)
  },
  "philosophy": {
    "style": string,
    "feel": string,
    "oneLine": string (under 120 chars),
    "tensions": string[] (optional)
  },
  "colors": {
    "palette": [
      { "token": "--token-name", "hex": "#RRGGBB", "usage": "description" }
    ] (6-20 items),
    "rules": string[] (min 3, declarative rules)
  },
  "typography": {
    "fontStack": {
      "ui": string (CSS font-family),
      "mono": string (CSS font-family),
      "display": string (optional)
    },
    "scale": [
      {
        "token": "--text-xx",
        "size": "NNpx",
        "lineHeight": "NNpx",
        "weight": number,
        "letterSpacing": string (optional),
        "usage": string
      }
    ] (min 4),
    "rules": string[] (min 2)
  },
  "spacing": {
    "base": number (in px),
    "scale": string[] (e.g., ["--space-0: 0", "--space-1: 4px", ...]),
    "rules": string[] (min 3 — IMPORTANT: include specific rules like "Section top/bottom padding: 96px", "Card internal padding: 24px", "Nav item gap: 8px". RAW_FACTS.spacing.patterns shows exactly how spacing is used per component type — translate these into concrete rules.)
  },
  "radii": {
    "values": [
      { "token": "--radius-xx", "value": "Npx", "usage": string }
    ] (min 2)
  },
  "shadows": [
    { "token": "--shadow-xx", "value": "CSS shadow", "usage": string }
  ] (min 1),
  "motion": {
    "easings": [
      { "token": "--ease-xx", "value": "cubic-bezier(...)", "usage": string }
    ],
    "durations": [
      { "token": "--duration-xx", "value": "NNms", "usage": string }
    ],
    "rules": string[] (min 1)
  },
  "components": [
    {
      "name": string,
      "description": string (DETAILED — include exact colors, padding, border-radius, font-size, hover states),
      "styles": { "property": "value", ... }
    }
  ] (min 3),
  "compositionRules": string[] (min 3),
  "antipatterns": string[] (8-20 items),
  "implementationNotes": string (include a page layout blueprint — describe the section order and structure from AESTHETIC_ANALYSIS.layout_structure)
}

Critical rules:
1. For colors: ALWAYS prefer AESTHETIC_ANALYSIS colors over RAW_FACTS when available. The vision model sees the actual rendered page; CSS clustering can miss computed/dynamic colors.
2. The "--accent" token MUST match the primary CTA button color from AESTHETIC_ANALYSIS.primary_cta_color.
3. Component styles must use ACTUAL color values (hex), not just token references. An agent reading just the component pattern should be able to build it.
4. Include at least 8 specific anti-patterns. Generic ones like "avoid inconsistency" are useless. Specific ones like "Never use #6e11b0 for buttons — the correct CTA color is #c7ff69" are useful.
5. compositionRules must describe the ACTUAL page layout: section order, grid patterns, alignment, content width.
6. implementationNotes MUST include a "Page Layout Blueprint" describing the sections in order (from AESTHETIC_ANALYSIS.layout_structure and content_sections). This is what the agent uses to structure the HTML.
7. SPACING IS CRITICAL. RAW_FACTS.spacing.patterns shows how spacing is actually used per component type (e.g., "section padding: 64px 24px", "card padding: 24px", "nav gap: 8px"). Translate these into specific spacing rules. Do NOT just output a generic "use 4px increments" — output rules like "Section vertical padding: 64-96px", "Card internal padding: 20-24px", "Gap between grid items: 24px", "Navigation item spacing: 8-12px". These concrete values are what make the recreated page feel right.
8. Output ONLY valid JSON. No preamble, no explanation, no markdown fences.

Quality bar: A developer reading ONLY this file should produce a page that matches the original's color scheme, layout structure, typography, spacing rhythm, and overall aesthetic.`;

export const SYNTHESIS_PROMPT_VERSION = "2.1.0";
