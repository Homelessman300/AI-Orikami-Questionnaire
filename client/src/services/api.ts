
/**
 * Purpose:
 * Handles communication between the React frontend
 * and the Express backend.
 *
 * Features:
 * - Sends messages to the AI chat.
 * - Maintains conversation history.
 * - Extracts project configuration using Ollama.
 * - Validates project configuration.
 * - Generates FHIR questionnaires.
 * - Extracts questionnaire schedules using Ollama.
 *
 * Note:
 * AI extraction does not automatically save
 * projects, questionnaires, or schedules.
 */

import type { ProjectConfig } from "../types/project";
import type { ScheduleConfig } from "../types/schedule";

/**
 * Backend API base URL.
 */
const API_BASE_URL = "http://localhost:3000";

/**
 * Represents a message in the AI conversation.
 *
 * Only user and assistant messages are sent
 * from the frontend to the backend.
 */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Represents the response from the AI chat endpoint.
 */
type ChatResponse = {
  reply: string;
};

/**
 * Represents the response from the project
 * extraction endpoint.
 */
type ExtractProjectResponse = {
  project: ProjectConfig;
};

/**
 * Sends a message to the AI chat backend.
 *
 * @param message - New message entered by the user.
 * @param history - Previous conversation messages.
 *
 * @returns The AI-generated response.
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Chat request failed: ${response.status}`
    );
  }

  const data = (await response.json()) as ChatResponse;

  if (typeof data.reply !== "string") {
    throw new Error(
      "Invalid AI response from backend"
    );
  }

  return data.reply;
}

/**
 * Extracts project configuration from conversation history.
 *
 * The backend sends the conversation to Ollama,
 * which returns structured project information.
 *
 * This function does not validate or save
 * the project to KRANE.
 */
export async function extractProject(
  messages: ChatMessage[]
): Promise<ProjectConfig> {
  const response = await fetch(
    `${API_BASE_URL}/api/project/extract`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Project extraction failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as ExtractProjectResponse;

  if (
    typeof data.project !== "object" ||
    data.project === null ||
    Array.isArray(data.project)
  ) {
    throw new Error(
      "Invalid project configuration response"
    );
  }

  return data.project;
}

/**
 * Represents the backend project validation result.
 */
export type ProjectValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Sends project configuration to the backend
 * for validation.
 *
 * This function does not save anything to KRANE.
 */
export async function validateProject(
  project: ProjectConfig
): Promise<ProjectValidationResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/project/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ project }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Project validation failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as ProjectValidationResult;

  if (
    typeof data.valid !== "boolean" ||
    !Array.isArray(data.errors) ||
    !data.errors.every(
      (error) => typeof error === "string"
    )
  ) {
    throw new Error(
      "Invalid validation response from backend"
    );
  }

  return data;
}

/**
 * Types for AI-generated FHIR questionnaires.
 */
export interface FhirQuestionnaireItem {
  linkId: string;
  text: string;
  type: string;
  required?: boolean;

  answerOption?: Array<{
    valueString?: string;
    valueInteger?: number;

    valueCoding?: {
      system?: string;
      code?: string;
      display?: string;
    };
  }>;

  item?: FhirQuestionnaireItem[];
}

export interface FhirQuestionnaire {
  resourceType: "Questionnaire";
  status: "draft";
  title: string;
  item: FhirQuestionnaireItem[];
}

/**
 * Result returned by questionnaire generation.
 */
export type QuestionnaireGenerationResult =
  | {
      status: "complete";
      questionnaire: FhirQuestionnaire;
      validation: {
        valid: boolean;
        errors: string[];
      };
    }
  | {
      status: "needs_information";
      questions: string[];
    };

/**
 * Generates a FHIR Questionnaire using Ollama.
 *
 * The backend handles AI generation and validation.
 * React only displays the result.
 */
export async function generateQuestionnaire(
  messages: ChatMessage[]
): Promise<QuestionnaireGenerationResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/questionnaire/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    const details =
      data &&
      typeof data === "object" &&
      "errors" in data &&
      Array.isArray(data.errors)
        ? data.errors.join(" ")
        : `Request failed: ${response.status}`;

    throw new Error(details);
  }

  return (await response.json()) as QuestionnaireGenerationResult;
}

/**
 * Represents the result of AI schedule extraction.
 *
 * "complete":
 * All required schedule information was extracted
 * and validated by the backend.
 *
 * "needs_information":
 * Some schedule fields are missing or invalid.
 */
export type ScheduleExtractionResult = {
  status: "complete" | "needs_information";
  schedule: Partial<ScheduleConfig>;
  missingFields: string[];
};

/**
 * Extracts questionnaire scheduling information
 * from the AI Chat conversation.
 *
 * The backend uses Ollama to extract:
 * - Questionnaire frequency.
 * - Start and end dates.
 * - Availability time.
 * - Selected weekdays or specific dates.
 * - Reminder settings.
 *
 * The extracted schedule is returned to React
 * for review and confirmation.
 *
 * This function does not save the schedule.
 */
export async function extractScheduleFromChat(
  messages: ChatMessage[]
): Promise<ScheduleExtractionResult> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error(
      "Describe your questionnaire schedule in AI Chat first."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/schedule/extract`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    }
  );

  if (!response.ok) {
    const data: unknown = await response
      .json()
      .catch(() => null);

    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Schedule extraction failed: ${response.status}`;

    throw new Error(message);
  }

  const data: unknown = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    !("status" in data) ||
    (data.status !== "complete" &&
      data.status !== "needs_information") ||
    !("schedule" in data) ||
    !data.schedule ||
    typeof data.schedule !== "object" ||
    Array.isArray(data.schedule) ||
    !("missingFields" in data) ||
    !Array.isArray(data.missingFields) ||
    !data.missingFields.every(
      (field) => typeof field === "string"
    )
  ) {
    throw new Error(
      "Invalid schedule extraction response from backend."
    );
  }

  return data as ScheduleExtractionResult;
}
