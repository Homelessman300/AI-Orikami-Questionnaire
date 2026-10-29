/**
 * 
 * API service for Orikami's AI chat functionality.
 * features:
 * - Sends user messages to the backend for AI processing.
 * - Receives AI-generated responses from the backend.
 * - Handles errors and provides feedback to the user.
 */
export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatHistoryMessage[] = []
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ?? "Failed to get an AI response"
    );
  }

  return data.reply;
}