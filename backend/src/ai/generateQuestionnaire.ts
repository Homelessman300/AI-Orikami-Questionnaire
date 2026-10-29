
/**
 * File: generateQuestionnaire.ts
 *
 * Purpose:
 * Generate a FHIR Questionnaire using AI Chat history.
 *
 * The AI:
 * - Understands questionnaire requirements.
 * - Requests missing essential information.
 * - Generates FHIR Questionnaire JSON.
 *
 */

import { askOllama } from "./ollama.ts";
import type { ChatMessage } from "./ollama.ts";

export type QuestionnaireGenerationResult =
  | {
      status: "complete";
      questionnaire: Record<string, unknown>;
    }
  | {
      status: "needs_information";
      questions: string[];
    };

const questionnairePrompt = `
You are an AI assistant for Orikami.

Your task is to generate a FHIR R4 Questionnaire
from the user's conversation.

IMPORTANT RULES:

1. Only generate questionnaires requested by the user.
2. Use information from the conversation.
3. Do not invent clinical requirements or study details.
4. If essential information is missing, ask questions.
5. Generate valid FHIR R4 Questionnaire JSON.
6. Do not include explanations or Markdown.
7. Return only a JSON object.

When information is missing, return:

{
  "status": "needs_information",
  "questions": [
    "What information is missing?"
  ]
}

When enough information is available, return:

{
  "status": "complete",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "status": "draft",
    "title": "Questionnaire title",
    "item": []
  }
}

FHIR QUESTIONNAIRE RULES:

- resourceType must be "Questionnaire".
- status must be "draft".
- title must describe the questionnaire.
- item must contain the generated questions.
- Each item must have a unique linkId.
- Each item must have a text.
- Each item must have a valid FHIR item type.
- For choice questions, use answerOption.
- Use valueString for string answer options.
- Use valueCoding when coded options are appropriate.
- Do not generate QuestionnaireResponse.
- Do not invent participant answers.

Valid FHIR R4 item types include:
group, display, boolean, decimal, integer,
date, dateTime, time, string, text, url,
choice, open-choice, attachment, reference, quantity.

Return JSON only.
`;

function parseJsonResponse(
  response: string
): unknown {
  let cleaned = response.trim();

  // Remove optional Markdown code fences.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned) as unknown;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function generateQuestionnaire(
  messages: ChatMessage[]
): Promise<QuestionnaireGenerationResult> {
  if (
    !Array.isArray(messages) ||
    !messages.some(
      (message) =>
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
  ) {
    return {
      status: "needs_information",
      questions: [
        "What questionnaire would you like to create?",
      ],
    };
  }

  const response = await askOllama([
    {
      role: "system",
      content: questionnairePrompt,
    },
    ...messages.filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant"
    ),
  ]);

  const parsed = parseJsonResponse(response);

  if (!isRecord(parsed)) {
    throw new Error(
      "AI returned an invalid questionnaire response."
    );
  }

  if (parsed.status === "needs_information") {
    if (
      !Array.isArray(parsed.questions) ||
      !parsed.questions.every(
        (question) => typeof question === "string"
      ) ||
      parsed.questions.length === 0
    ) {
      throw new Error(
        "AI returned invalid clarification questions."
      );
    }

    return {
      status: "needs_information",
      questions: parsed.questions,
    };
  }

  if (
    parsed.status !== "complete" ||
    !isRecord(parsed.questionnaire)
  ) {
    throw new Error(
      "AI did not return a valid questionnaire result."
    );
  }

  return {
    status: "complete",
    questionnaire: parsed.questionnaire,
  };
}
