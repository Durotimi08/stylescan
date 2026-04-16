import OpenAI from "openai";
import type { SynthesisLLMInput } from "@stylescan/types";
import type { DesignMdSchemaType } from "@stylescan/schema";
import { validateDesignMd } from "@stylescan/schema";
import { buildRetryPrompt } from "./prompts/retry";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

const MAX_RETRIES = 2;

export async function callSynthesisLLM(
  input: SynthesisLLMInput
): Promise<DesignMdSchemaType> {
  const openai = getClient();

  const systemPrompt = input.prompt;
  const userMessage = `RAW_FACTS:\n${JSON.stringify(input.rawFacts, null, 2)}\n\nAESTHETIC_ANALYSIS:\n${JSON.stringify(input.aestheticAnalysis, null, 2)}`;

  let lastErrors: unknown = input.errors;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    const userContent =
      attempts === 0 && !lastErrors
        ? userMessage
        : `${userMessage}\n\n${buildRetryPrompt(lastErrors)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      attempts++;
      lastErrors = { _error: "No valid JSON found in response" };
      continue;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const validation = validateDesignMd(parsed);

      if (validation.ok) {
        return validation.data;
      }

      lastErrors = validation.errors;
      attempts++;
    } catch (e) {
      lastErrors = { _error: `JSON parse error: ${(e as Error).message}` };
      attempts++;
    }
  }

  throw new Error(
    `Synthesis LLM failed after ${MAX_RETRIES + 1} attempts. Last errors: ${JSON.stringify(lastErrors)}`
  );
}
