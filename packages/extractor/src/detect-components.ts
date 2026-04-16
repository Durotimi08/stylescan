import type { RawExtraction, ComponentGuess } from "@stylescan/types";

const COMPONENT_HEURISTICS: Array<{
  type: string;
  match: (el: RawExtraction["elements"][0]) => boolean;
}> = [
  {
    type: "button",
    match: (el) =>
      el.tag === "button" ||
      el.role === "button" ||
      el.classes.some((c) => c.toLowerCase().includes("btn") || c.toLowerCase().includes("button")),
  },
  {
    type: "input",
    match: (el) =>
      el.tag === "input" ||
      el.tag === "textarea" ||
      el.classes.some((c) => c.toLowerCase().includes("input")),
  },
  {
    type: "card",
    match: (el) =>
      el.classes.some((c) => c.toLowerCase().includes("card")) ||
      (el.styles["border-radius"] !== "0px" &&
        el.styles["background-color"] !== "rgba(0, 0, 0, 0)" &&
        el.styles.padding !== "0px"),
  },
  {
    type: "navigation",
    match: (el) =>
      el.tag === "nav" ||
      el.role === "navigation" ||
      el.classes.some((c) => c.toLowerCase().includes("nav") || c.toLowerCase().includes("header")),
  },
  {
    type: "modal",
    match: (el) =>
      el.role === "dialog" ||
      el.classes.some((c) => c.toLowerCase().includes("modal") || c.toLowerCase().includes("dialog")),
  },
  {
    type: "badge",
    match: (el) =>
      el.classes.some(
        (c) =>
          c.toLowerCase().includes("badge") ||
          c.toLowerCase().includes("tag") ||
          c.toLowerCase().includes("chip")
      ),
  },
];

export function heuristicComponentDetection(
  extraction: RawExtraction
): ComponentGuess[] {
  const guesses: ComponentGuess[] = [];
  const seenTypes = new Set<string>();

  for (const el of extraction.elements) {
    for (const heuristic of COMPONENT_HEURISTICS) {
      if (seenTypes.has(heuristic.type)) continue;
      if (heuristic.match(el)) {
        guesses.push({
          type: heuristic.type,
          selector: el.classes.length > 0 ? `.${el.classes[0]}` : el.tag,
          confidence: 0.7,
          styles: el.styles,
        });
        seenTypes.add(heuristic.type);
        break;
      }
    }
  }

  return guesses;
}
