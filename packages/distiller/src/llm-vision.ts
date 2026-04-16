import OpenAI from "openai";
import type { AestheticAnalysis, VisionLLMInput } from "@stylescan/types";
import { validateAestheticAnalysis } from "@stylescan/schema";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

export async function callVisionLLM(
  input: VisionLLMInput
): Promise<AestheticAnalysis> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: input.screenshotUrl,
            },
          },
          {
            type: "text",
            text: `${input.prompt}\n\nClustered data from CSS extraction:\n${JSON.stringify(input.rawFacts, null, 2)}`,
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Vision LLM did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validation = validateAestheticAnalysis(parsed);

  if (!validation.ok) {
    throw new Error(
      `Vision LLM output failed validation: ${JSON.stringify(validation.errors)}`
    );
  }

  return validation.data;
}
