// ─── User & Auth ───

export type Plan = "free" | "hobby" | "pro" | "team" | "enterprise";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface User {
  id: string;
  email: string;
  clerkUserId: string | null;
  plan: Plan;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  plan: Plan;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

// ─── Scan ───

export type ScanMode = "full_page" | "region" | "multi_page";
export type ScanStatus = "queued" | "running" | "complete" | "failed";

export interface Scan {
  id: string;
  userId: string;
  workspaceId: string | null;
  sourceUrl: string;
  mode: ScanMode;
  status: ScanStatus;
  confidence: number | null;
  designMd: string | null;
  tokensJson: DesignTokens | null;
  componentsJson: ComponentPattern[] | null;
  rawFactsJson: RawFacts | null;
  screenshotUrl: string | null;
  costCents: number | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ScanCreateRequest {
  sourceUrl: string;
  mode: ScanMode;
}

export interface ScanResponse {
  scanId: string;
  status: ScanStatus;
  estimatedMs: number;
}

// ─── Raw Extraction (from extension content script) ───

export interface ElementSnapshot {
  tag: string;
  classes: string[];
  role: string | null;
  rect: DOMRect;
  styles: Record<string, string>;
  textContent: string | null;
}

export interface RawExtraction {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  elements: ElementSnapshot[];
  rawCss: string;
  fonts: FontInfo[];
  mediaQueries: string[];
  capturedAt: string;
}

export interface FontInfo {
  family: string;
  weights: number[];
  source: "google" | "local" | "custom" | "unknown";
}

// ─── Clustered / Processed Data ───

export interface ClusteredColor {
  hex: string;
  role: string;
  count: number;
  weight: number;
}

export interface ClusteredColors {
  canvas: string;
  surface: string;
  overlay: string;
  fgPrimary: string;
  fgSecondary: string;
  fgTertiary: string;
  accent: string;
  accentHover: string;
  borderSubtle: string;
  borderStrong: string;
  success: string | null;
  warning: string | null;
  error: string | null;
  raw: ClusteredColor[];
}

export interface ClusteredTypography {
  fontStack: {
    ui: string;
    mono: string | null;
    display: string | null;
  };
  scale: TypeScaleEntry[];
}

export interface TypeScaleEntry {
  token: string;
  size: string;
  lineHeight: string;
  weight: number;
  letterSpacing: string | null;
  usage: string;
}

export interface ClusteredSpacing {
  base: number;
  scale: number[];
}

export interface ClusteredRadii {
  values: { token: string; value: string; usage: string }[];
}

export interface ShadowEntry {
  token: string;
  value: string;
  usage: string;
}

export interface ComponentGuess {
  type: string;
  selector: string;
  confidence: number;
  styles: Record<string, string>;
}

export interface RawFacts {
  colors: ClusteredColors;
  typography: ClusteredTypography;
  spacing: ClusteredSpacing;
  radii: ClusteredRadii;
  shadows: ShadowEntry[];
  componentGuesses: ComponentGuess[];
}

// ─── LLM Pipeline ───

export interface AestheticAnalysis {
  style_keywords: string[];
  era: string;
  one_line_summary: string;
  color_mood:
    | "dark-first"
    | "light-first"
    | "high-contrast"
    | "muted"
    | "vibrant";
  density: "spacious" | "balanced" | "dense";
  formality: "playful" | "neutral" | "formal";
  notable_patterns: string[];
  primary_cta_color?: string;
  background_color?: string;
  text_color?: string;
  accent_colors?: string[];
  layout_structure?: string[];
  nav_style?: string;
  hero_style?: string;
  content_sections?: string[];
  confidence: number;
}

export interface VisionLLMInput {
  screenshotUrl: string;
  rawFacts: RawFacts;
  prompt: string;
}

export interface SynthesisLLMInput {
  rawFacts: RawFacts;
  aestheticAnalysis: AestheticAnalysis;
  prompt: string;
  errors?: unknown;
}

// ─── design.md Schema ───

export interface DesignMdFrontmatter {
  stylescan_version: string;
  source_url: string;
  scanned_at: string;
  confidence: number;
  pages_analyzed?: number;
}

export interface ColorToken {
  token: string;
  hex: string;
  usage: string;
}

export interface ComponentPattern {
  name: string;
  description: string;
  styles: Record<string, string>;
}

export interface DesignMd {
  frontmatter: DesignMdFrontmatter;
  philosophy: {
    style: string;
    feel: string;
    oneLine: string;
    tensions?: string[];
  };
  colors: {
    palette: ColorToken[];
    rules: string[];
  };
  typography: {
    fontStack: {
      ui: string;
      mono: string;
      display?: string;
    };
    scale: TypeScaleEntry[];
    rules: string[];
  };
  spacing: {
    base: number;
    scale: string[];
    rules: string[];
  };
  radii: {
    values: { token: string; value: string; usage: string }[];
  };
  shadows: ShadowEntry[];
  motion: {
    easings: { token: string; value: string; usage: string }[];
    durations: { token: string; value: string; usage: string }[];
    rules: string[];
  };
  components: ComponentPattern[];
  compositionRules: string[];
  antipatterns: string[];
  implementationNotes?: string;
}

// ─── Design Tokens (W3C format) ───

export interface DesignTokenValue {
  $value: string | Record<string, string | number>;
  $type: string;
}

export interface DesignTokenGroup {
  [key: string]: DesignTokenValue | DesignTokenGroup;
}

export interface DesignTokens {
  color?: DesignTokenGroup;
  typography?: DesignTokenGroup;
  spacing?: DesignTokenGroup;
  borderRadius?: DesignTokenGroup;
  shadow?: DesignTokenGroup;
}

// ─── Library ───

export interface LibraryEntry {
  id: string;
  slug: string;
  title: string;
  sourceUrl: string;
  description: string | null;
  designMd: string;
  tokensJson: DesignTokens | null;
  componentsJson: ComponentPattern[] | null;
  isVerified: boolean;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── API Keys ───

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

// ─── Usage Events ───

export type UsageEventType =
  | "scan_started"
  | "scan_completed"
  | "library_download";

export interface UsageEvent {
  id: number;
  workspaceId: string;
  eventType: UsageEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Scan Job (queue payload) ───

export interface ScanJob {
  scanId: string;
  userId: string;
  sourceUrl: string;
  mode: ScanMode;
  extraction: RawExtraction;
  screenshotUrl: string;
}

// ─── Plan Limits ───

export const PLAN_LIMITS: Record<Plan, { scansPerMonth: number }> = {
  free: { scansPerMonth: 10 },
  hobby: { scansPerMonth: 50 },
  pro: { scansPerMonth: 200 },
  team: { scansPerMonth: 500 },
  enterprise: { scansPerMonth: Infinity },
};
