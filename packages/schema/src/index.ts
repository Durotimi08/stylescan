import { z } from "zod";

// ─── Frontmatter ───

export const DesignMdFrontmatter = z.object({
  stylescan_version: z.string(),
  source_url: z.string(),
  scanned_at: z.string(),
  confidence: z.number().min(0).max(1),
  pages_analyzed: z.number().int().min(1).optional(),
});

// ─── Color Token ───

export const ColorToken = z.object({
  token: z.string().min(1),
  hex: z.string().min(3),
  usage: z.string().min(1),
});

// ─── Type Scale Entry ───

export const TypeScaleEntry = z.object({
  token: z.string(),
  size: z.string(),
  lineHeight: z.string(),
  weight: z.number(),
  letterSpacing: z.string().optional(),
  usage: z.string(),
});

// ─── Shadow Entry ───

export const ShadowEntry = z.object({
  token: z.string(),
  value: z.string(),
  usage: z.string(),
});

// ─── Motion Easing ───

export const MotionEasing = z.object({
  token: z.string(),
  value: z.string(),
  usage: z.string(),
});

// ─── Motion Duration ───

export const MotionDuration = z.object({
  token: z.string(),
  value: z.string(),
  usage: z.string(),
});

// ─── Component Pattern ───

export const ComponentPattern = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  styles: z.record(z.string()),
});

// ─── Radius Entry ───

export const RadiusEntry = z.object({
  token: z.string(),
  value: z.string(),
  usage: z.string(),
});

// ─── Full design.md Schema ───

export const DesignMdSchema = z.object({
  frontmatter: DesignMdFrontmatter,
  philosophy: z.object({
    style: z.string().min(1),
    feel: z.string().min(1),
    oneLine: z.string().min(1),
    tensions: z.array(z.string()).optional(),
  }),
  colors: z.object({
    palette: z.array(ColorToken).min(1),
    rules: z.array(z.string()).min(1),
  }),
  typography: z.object({
    fontStack: z.object({
      ui: z.string().min(1),
      mono: z.string(),
      display: z.string().optional(),
    }),
    scale: z.array(TypeScaleEntry).min(1),
    rules: z.array(z.string()).min(1),
  }),
  spacing: z.object({
    base: z.number().min(1),
    scale: z.array(z.string()).min(1),
    rules: z.array(z.string()).min(1),
  }),
  radii: z.object({
    values: z.array(RadiusEntry).min(1),
  }),
  shadows: z.array(ShadowEntry).min(1),
  motion: z.object({
    easings: z.array(MotionEasing).min(1),
    durations: z.array(MotionDuration).min(1),
    rules: z.array(z.string()).min(1),
  }),
  components: z.array(ComponentPattern).min(1),
  compositionRules: z.array(z.string()).min(1),
  antipatterns: z.array(z.string()).min(1),
  implementationNotes: z.string().optional(),
}).passthrough();

export type DesignMdSchemaType = z.infer<typeof DesignMdSchema>;

// ─── Aesthetic Analysis Schema (Vision LLM output) ───

export const AestheticAnalysisSchema = z.object({
  style_keywords: z.array(z.string()).min(1),
  era: z.string(),
  one_line_summary: z.string(),
  color_mood: z.string(),
  density: z.string(),
  formality: z.string(),
  notable_patterns: z.array(z.string()),
  primary_cta_color: z.string().optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
  accent_colors: z.array(z.string()).optional(),
  layout_structure: z.array(z.string()).optional(),
  nav_style: z.string().optional(),
  hero_style: z.string().optional(),
  content_sections: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
}).passthrough();

// ─── Validation Functions ───

export function validateDesignMd(raw: unknown) {
  const parsed = DesignMdSchema.safeParse(raw);
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: parsed.error.format() };
}

export function validateAestheticAnalysis(raw: unknown) {
  const parsed = AestheticAnalysisSchema.safeParse(raw);
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: parsed.error.format() };
}

// ─── design.md Serializer ───

export function serializeDesignMd(data: DesignMdSchemaType): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`stylescan_version: ${data.frontmatter.stylescan_version}`);
  lines.push(`source_url: ${data.frontmatter.source_url}`);
  lines.push(`scanned_at: ${data.frontmatter.scanned_at}`);
  lines.push(`confidence: ${data.frontmatter.confidence}`);
  if (data.frontmatter.pages_analyzed) {
    lines.push(`pages_analyzed: ${data.frontmatter.pages_analyzed}`);
  }
  lines.push("---");
  lines.push("");

  // Philosophy
  lines.push("# Design System");
  lines.push("");
  lines.push("## 1. Design Philosophy");
  lines.push("");
  lines.push(`**Style:** ${data.philosophy.style}`);
  lines.push(`**Feel:** ${data.philosophy.feel}`);
  lines.push(`**One-line summary:** "${data.philosophy.oneLine}"`);
  if (data.philosophy.tensions?.length) {
    lines.push("");
    lines.push("**Core tensions resolved:**");
    for (const t of data.philosophy.tensions) {
      lines.push(`- ${t}`);
    }
  }
  lines.push("");

  // Colors
  lines.push("## 2. Color System");
  lines.push("");
  lines.push("### 2.1 Palette (Semantic)");
  lines.push("");
  lines.push("| Token | Hex | Usage |");
  lines.push("|---|---|---|");
  for (const c of data.colors.palette) {
    lines.push(`| \`${c.token}\` | \`${c.hex}\` | ${c.usage} |`);
  }
  lines.push("");
  lines.push("### 2.2 Rules");
  lines.push("");
  for (const r of data.colors.rules) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  // Typography
  lines.push("## 3. Typography");
  lines.push("");
  lines.push("### 3.1 Font Stack");
  lines.push("");
  lines.push(`- **UI / Body:** \`${data.typography.fontStack.ui}\``);
  lines.push(`- **Monospace:** \`${data.typography.fontStack.mono}\``);
  if (data.typography.fontStack.display) {
    lines.push(`- **Display:** \`${data.typography.fontStack.display}\``);
  }
  lines.push("");
  lines.push("### 3.2 Type Scale");
  lines.push("");
  lines.push(
    "| Token | Size | Line-height | Weight | Letter-spacing | Usage |"
  );
  lines.push("|---|---|---|---|---|---|");
  for (const t of data.typography.scale) {
    lines.push(
      `| \`${t.token}\` | ${t.size} | ${t.lineHeight} | ${t.weight} | ${t.letterSpacing ?? "0"} | ${t.usage} |`
    );
  }
  lines.push("");
  lines.push("### 3.3 Rules");
  lines.push("");
  for (const r of data.typography.rules) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  // Spacing
  lines.push("## 4. Spacing & Layout");
  lines.push("");
  lines.push(`**Base unit:** ${data.spacing.base}px`);
  lines.push("");
  lines.push(`**Scale:** ${data.spacing.scale.join(" | ")}`);
  lines.push("");
  for (const r of data.spacing.rules) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  // Radii
  lines.push("## 5. Radii, Borders, Shadows");
  lines.push("");
  lines.push("### 5.1 Border Radii");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|---|---|---|");
  for (const r of data.radii.values) {
    lines.push(`| \`${r.token}\` | ${r.value} | ${r.usage} |`);
  }
  lines.push("");

  // Shadows
  lines.push("### 5.2 Shadows");
  lines.push("");
  for (const s of data.shadows) {
    lines.push(`- \`${s.token}\`: \`${s.value}\` — ${s.usage}`);
  }
  lines.push("");

  // Motion
  lines.push("## 6. Motion & Interaction");
  lines.push("");
  lines.push("### 6.1 Timing Functions");
  lines.push("");
  for (const e of data.motion.easings) {
    lines.push(`- **${e.token}:** \`${e.value}\` — ${e.usage}`);
  }
  lines.push("");
  lines.push("### 6.2 Durations");
  lines.push("");
  lines.push("| Token | Value | Usage |");
  lines.push("|---|---|---|");
  for (const d of data.motion.durations) {
    lines.push(`| \`${d.token}\` | ${d.value} | ${d.usage} |`);
  }
  lines.push("");
  lines.push("### 6.3 Rules");
  lines.push("");
  for (const r of data.motion.rules) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  // Components
  lines.push("## 7. Component Patterns");
  lines.push("");
  for (const comp of data.components) {
    lines.push(`### ${comp.name}`);
    lines.push("");
    lines.push(comp.description);
    lines.push("");
    lines.push("```");
    for (const [key, value] of Object.entries(comp.styles)) {
      lines.push(`${key}: ${value}`);
    }
    lines.push("```");
    lines.push("");
  }

  // Composition Rules
  lines.push("## 8. Composition Rules");
  lines.push("");
  for (const r of data.compositionRules) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  // Anti-patterns
  lines.push("## 9. Anti-patterns (Do Not Do)");
  lines.push("");
  for (const a of data.antipatterns) {
    lines.push(`- ${a}`);
  }
  lines.push("");

  // Implementation Notes
  if (data.implementationNotes) {
    lines.push("## 10. Implementation Notes");
    lines.push("");
    lines.push(data.implementationNotes);
    lines.push("");
  }

  return lines.join("\n");
}

// ─── design.md Parser (markdown → structured) ───

export function parseDesignMdFrontmatter(
  markdown: string
): Record<string, string | number> | null {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter: Record<string, string | number> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    const num = Number(value);
    frontmatter[key] = isNaN(num) ? value : num;
  }
  return frontmatter;
}
