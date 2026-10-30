
/**
 * File: generateQuestionnaire.ts
 *
 * Purpose:
 * Uses Ollama to generate a FHIR R4 Questionnaire
 * from the user's AI Chat conversation.
 *
 * Features:
 * - AI generates questionnaire questions.
 * - Requests missing essential information.
 * - Disables Qwen3 thinking.
 * - Requests JSON-only output.
 * - Parses and checks the AI response.
 *
 * Does not save anything to KRANE.
 */

import {
  askOllama,
  type ChatMessage,
} from "./ollama.ts";

export type QuestionnaireGenerationResult =
  | {
      status: "complete";
      questionnaire: Record<string, unknown>;
    }
  | {
      status: "needs_information";
      questions: string[];
    };

/**
 * System prompt for questionnaire generation.
 */
const questionnairePrompt = `
You are an AI questionnaire designer for Orikami.

Your responsibility is to independently design
FHIR R4 Questionnaires based on research descriptions.

The user describes what they want to investigate.
YOU decide which questions are appropriate.

IMPORTANT:

- Do not ask the user to provide questionnaire questions.
- Generate suitable questions independently.
- Choose appropriate answer types and answer options.
- Use the user's research objective as your primary source.
- Do not invent clinical facts or claim clinical validation.
- Do not invent research requirements that were not provided.
- Do not include participant answers.
- Return only valid JSON.

WHEN TO GENERATE:

If the conversation describes a research objective,
generate a questionnaire.

Examples of sufficient research objectives:
- Investigating sleep quality.
- Monitoring daily pain.
- Studying physical activity.
- Measuring general wellbeing.

Do not ask for a project name, dates, participant count,
or scheduling information to generate the questionnaire.

Only request clarification if the research objective
is genuinely missing or impossible to determine.

FHIR R4 REQUIREMENTS:

Generate a Questionnaire resource with:

- resourceType: "Questionnaire"
- status: "draft"
- title: a meaningful questionnaire title
- item: an array containing the questions

Each question must have:
- A unique linkId
- Clear question text
- A valid FHIR R4 item type
- Appropriate answerOption values for choice questions
- A required flag when appropriate

You may generate 5 to 10 relevant questions when
the user does not specify a question count.

Do not copy example questions.
Design questions specifically for the user's study.

RESPONSE FORMAT:

Return one JSON object.

For successful generation, use:
{
  "status": "complete",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "status": "draft",
    "title": "Generated title",
    "item": []
  }
}

The empty item array above is only a structural placeholder.
A completed questionnaire MUST contain real questions.

Only when the research objective is unknown, use:
{
  "status": "needs_information",
  "questions": [
    "What is the main research objective of your study?"
  ]
}

Never return generic placeholder questions such as
"What information is missing?".

Do not return Markdown, explanations, or thinking tags.
`;

/**
 * Checks whether a value is a JSON object.
 */
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Removes unwanted thinking tags and Markdown
 * before parsing the AI response.
 */
function parseJsonResponse(
  response: string
): unknown {
  const cleaned = response
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<\/?think>/g, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (!cleaned) {
    throw new Error(
      "Ollama returned an empty JSON response."
    );
  }

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    console.error(
      "Invalid JSON returned by Ollama:",
      cleaned
    );

    throw new Error(
      "Ollama returned invalid or incomplete JSON."
    );
  }
}

/**
 * Generates a questionnaire from the conversation.
 */
export async function generateQuestionnaire(
  messages: ChatMessage[]
): Promise<QuestionnaireGenerationResult> {
  const hasUserMessage =
    Array.isArray(messages) &&
    messages.some(
      (message) =>
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    );

  if (!hasUserMessage) {
    return {
      status: "needs_information",
      questions: [
        "What questionnaire would you like to create?",
      ],
    };
  }

  /**
   * Only include user and assistant messages.
   * The questionnaire system prompt is added separately.
   */
  const conversation = messages.filter(
    (message) =>
      (message.role === "user" ||
        message.role === "assistant") &&
      typeof message.content === "string"
  );

  /**
   * Request structured JSON from Ollama.
   *
   * think: false prevents Qwen3 reasoning tags.
   * format: json requests valid JSON output.
   * numPredict allows enough output for a questionnaire.
   */
  const response = await askOllama(
    [
      {
        role: "system",
        content: questionnairePrompt,
      },
      ...conversation,
    ],
    {
      think: false,
      format: "json",
      numPredict: 4096,
    }
  );

  const parsed = parseJsonResponse(response);

  if (!isRecord(parsed)) {
    throw new Error(
      "AI returned an invalid questionnaire response."
    );
  }

  /**
   * Handle missing information.
   */
  if (parsed.status === "needs_information") {
    if (
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0 ||
      !parsed.questions.every(
        (question) =>
          typeof question === "string" &&
          question.trim().length > 0
      )
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

  /**
   * Handle generated questionnaire.
   */
  if (parsed.status === "complete") {
    if (!isRecord(parsed.questionnaire)) {
      throw new Error(
        "AI returned an invalid questionnaire object."
      );
    }

    return {
      status: "complete",
      questionnaire: parsed.questionnaire,
    };
  }

  throw new Error(
    "AI returned an unexpected generation status."
  );
}
