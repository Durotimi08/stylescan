export const RETRY_PROMPT_TEMPLATE = `Your previous output failed schema validation. Errors:

{errors}

Regenerate the full design system JSON, fixing these issues. Do not change sections that passed validation.
Output ONLY valid JSON. No preamble, no explanation.`;

export function buildRetryPrompt(errors: unknown): string {
  return RETRY_PROMPT_TEMPLATE.replace(
    "{errors}",
    JSON.stringify(errors, null, 2)
  );
}
