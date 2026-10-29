
/**
 * File: ollama.ts
 *
 * Purpose:
 * Connects the backend to the local Ollama AI model.
 *
 * Supports:
 * - Normal AI conversations using the Orikami system prompt.
 * - Custom system prompts for structured JSON extraction.
 * - Conversation history.
 */

import "dotenv/config";
import { getSystemPrompt } from "./prompts.js";

/**
 * Represents a message sent to Ollama.
 *
 * system: Instructions for the AI.
 * user: A message from the user.
 * assistant: A previous AI response.
 */
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "qwen3:14b";

/**
 * Sends messages to Ollama and returns the AI response.
 *
 * If no custom system prompt is provided, the default
 * Orikami system prompt is automatically added.
 */
export async function askOllama(
  messages: ChatMessage[]
): Promise<string> {
  const hasCustomSystemPrompt = messages.some(
    (message) => message.role === "system"
  );

  const ollamaMessages: ChatMessage[] =
    hasCustomSystemPrompt
      ? messages
      : [
          {
            role: "system",
            content: getSystemPrompt(),
          },
          ...messages,
        ];

  const response = await fetch(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: ollamaMessages,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    message?: {
      role?: string;
      content?: string;
    };
  };

  if (typeof data.message?.content !== "string") {
    throw new Error("Invalid response from Ollama");
  }

  return data.message.content;
}
