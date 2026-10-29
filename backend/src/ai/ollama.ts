/**
 *
 * This module provides an interface to interact with the Ollama AI model.
 * features:
 * - Sends user messages to the Ollama API for processing.
 * - Receives AI-generated responses from the Ollama API.
 * - Handles errors and provides feedback to the user.
 */
import "dotenv/config";
import { getSystemPrompt } from "./prompts.ts";
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "qwen3:14b";

export async function askOllama(
  messages: ChatMessage[]
): Promise<string> {
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
        messages: [
          {
            role: "system",
            content: getSystemPrompt(),
          },
          ...messages,
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status}`
    );
  }

  const data = await response.json() as {
    message?: {
      content?: string;
    };
  };

  return data.message?.content ?? "";
}