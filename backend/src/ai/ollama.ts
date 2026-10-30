
/**
 * File: ollama.ts
 *
 * Purpose:
 * Communicates with the local Ollama AI model.
 *
 * Features:
 * - Supports normal AI Chat.
 * - Supports structured JSON generation.
 * - Allows disabling Qwen3 thinking.
 * - Keeps the model loaded between requests.
 */

import { getSystemPrompt } from "./prompts.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaOptions = {
  think?: boolean;
  format?: "json";
  numPredict?: number;
};

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ??
  "http://127.0.0.1:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "qwen3:14b";

/**
 * Sends messages to Ollama and returns the AI response.
 */
export async function askOllama(
  messages: ChatMessage[],
  options: OllamaOptions = {}
): Promise<string> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("At least one message is required.");
  }

  // Use the default prompt for normal chat unless
  // the caller provides a custom system prompt.
  const hasSystemPrompt = messages.some(
    (message) => message.role === "system"
  );

  const conversation: ChatMessage[] = hasSystemPrompt
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
        messages: conversation,
        stream: false,
        keep_alive: "30m",

        ...(options.think !== undefined && {
          think: options.think,
        }),

        ...(options.format && {
          format: options.format,
        }),

        options: {
          temperature: options.format === "json" ? 0 : 0.7,

          ...(options.numPredict !== undefined && {
            num_predict: options.numPredict,
          }),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama request failed (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    message?: {
      role?: string;
      content?: string;
      thinking?: string;
    };
    done_reason?: string;
  };

  const content = data.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error(
      "Ollama returned an empty response."
    );
  }

  if (data.done_reason === "length") {
    throw new Error(
      "Ollama response was truncated. Increase numPredict."
    );
  }

  return content;
}
