
/**
 * File: api.ts
 *
 * Purpose:
 * Handles communication between the React frontend
 * and the Express backend.
 *
 * Features:
 * - Sends messages to the AI chat.
 * - Maintains conversation history.
 * - Extracts project configuration using Ollama.
 *
 */

import type { ProjectConfig } from "../types/project";

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
 * Backend API base URL.
 */
const API_BASE_URL = "http://localhost:3000";

/**
 * Sends a message to the AI chat backend.
 *
 * @param message - The new message entered by the user.
 * @param history - Previous messages in the conversation.
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
 * @param messages - Conversation history.
 *
 * @returns Extracted project configuration.
 *
 * Note:
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
    data.project === null
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

  const data = (await response.json()) as ProjectValidationResult;

  if (
    typeof data.valid !== "boolean" ||
    !Array.isArray(data.errors) ||
    !data.errors.every(
      (error) => typeof error === "string"
    )
  ) {
    throw new Error("Invalid validation response from backend");
  }

  return data;
}
