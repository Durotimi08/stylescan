import type { RawExtraction, RawFacts } from "@stylescan/types";
import { clusterColors } from "./cluster-colors";
import { clusterFonts } from "./cluster-fonts";
import { clusterSpacing } from "./cluster-spacing";
import { clusterRadii } from "./cluster-radii";
import { extractShadows } from "./extract-shadows";
import { heuristicComponentDetection } from "./detect-components";

export function buildRawFacts(extraction: RawExtraction): RawFacts {
  return {
    colors: clusterColors(extraction),
    typography: clusterFonts(extraction),
    spacing: clusterSpacing(extraction),
    radii: clusterRadii(extraction),
    shadows: extractShadows(extraction),
    componentGuesses: heuristicComponentDetection(extraction),
  };
}
