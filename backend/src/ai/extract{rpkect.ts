
/**
 * File: extractProject.ts
 *
 * Purpose:
 * Extracts project configuration from an AI conversation.
 *
 * The AI converts conversation history into structured JSON.
 *
 * Missing values remain empty.
 * No information is saved to KRANE.
 */

import {
  askOllama,
  type ChatMessage,
} from "./ollama.js";

/**
 * Project configuration returned by the AI.
 */
export interface ExtractedProject {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  selfEnrollment: boolean | null;
}

/**
 * Extracts project details from conversation history.
 */
export async function extractProject(
  messages: ChatMessage[]
): Promise<ExtractedProject> {
  const extractionPrompt = `
You are a project configuration extraction assistant.

Extract project information from the conversation.

Return ONLY a valid JSON object with this structure:

{
  "name": "",
  "description": "",
  "startDate": "",
  "endDate": "",
  "selfEnrollment": null
}

Rules:
- Only extract information supplied by the user.
- Do not invent missing information.
- Use YYYY-MM-DD for dates.
- Missing text values must be empty strings.
- Missing dates must be empty strings.
- selfEnrollment must be true, false, or null.
- Use null if self-enrollment was not specified.
- If the user corrects a previous value, use the latest value.
- Do not include Markdown.
- Do not include explanations.
- Return valid JSON only.
`;

  /**
   * Send the conversation to Ollama with a custom
   * system prompt for JSON extraction.
   */
  const response = await askOllama([
    {
      role: "system",
      content: extractionPrompt,
    },
    ...messages.filter(
      (message) => message.role !== "system"
    ),
    {
      role: "user",
      content:
        "Extract the project configuration as JSON.",
    },
  ]);

  /**
   * Remove optional Markdown code fences.
   */
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  /**
   * Parse the JSON returned by Ollama.
   */
  const parsed: unknown = JSON.parse(cleaned);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Invalid project extraction response"
    );
  }

  const data = parsed as Record<string, unknown>;

  /**
   * Ensure every returned field has the correct type.
   *
   * Missing or incorrectly typed fields are replaced
   * with empty values.
   */
  return {
    name:
      typeof data.name === "string"
        ? data.name
        : "",

    description:
      typeof data.description === "string"
        ? data.description
        : "",

    startDate:
      typeof data.startDate === "string"
        ? data.startDate
        : "",

    endDate:
      typeof data.endDate === "string"
        ? data.endDate
        : "",

    selfEnrollment:
      typeof data.selfEnrollment === "boolean"
        ? data.selfEnrollment
        : null,
  };
}
