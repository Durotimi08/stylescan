import type { RawFacts, DesignTokens } from "@stylescan/types";
import type { DesignMdSchemaType } from "@stylescan/schema";

export function buildDesignTokens(
  rawFacts: RawFacts,
  designMd: DesignMdSchemaType
): DesignTokens {
  const tokens: DesignTokens = {
    color: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadow: {},
  };

  // Colors from the design.md palette
  for (const colorToken of designMd.colors.palette) {
    const name = colorToken.token.replace(/^--/, "").replace(/-/g, ".");
    setNestedValue(tokens.color!, name, {
      $value: colorToken.hex,
      $type: "color",
    });
  }

  // Typography
  for (const entry of designMd.typography.scale) {
    const name = entry.token.replace(/^--/, "").replace(/-/g, ".");
    setNestedValue(tokens.typography!, name, {
      $value: {
        fontFamily: designMd.typography.fontStack.ui,
        fontSize: entry.size,
        fontWeight: entry.weight,
        lineHeight: entry.lineHeight,
      },
      $type: "typography",
    });
  }

  // Spacing
  for (const spaceStr of designMd.spacing.scale) {
    // Parse "--space-N: Xpx" format
    const match = spaceStr.match(/(--[\w-]+):\s*(.+)/);
    if (match) {
      const name = match[1].replace(/^--/, "").replace(/-/g, ".");
      setNestedValue(tokens.spacing!, name, {
        $value: match[2].trim(),
        $type: "dimension",
      });
    }
  }

  // Border radius
  for (const radius of designMd.radii.values) {
    const name = radius.token.replace(/^--/, "").replace(/-/g, ".");
    setNestedValue(tokens.borderRadius!, name, {
      $value: radius.value,
      $type: "dimension",
    });
  }

  // Shadows
  for (const shadow of designMd.shadows) {
    const name = shadow.token.replace(/^--/, "").replace(/-/g, ".");
    setNestedValue(tokens.shadow!, name, {
      $value: shadow.value,
      $type: "shadow",
    });
  }

  return tokens;
}

function setNestedValue(obj: Record<string, any>, path: string, value: any) {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
}
