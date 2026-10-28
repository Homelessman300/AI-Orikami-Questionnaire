
export interface ChatResponse {
  success: boolean;
  model?: string;
  reply?: string;
  error?: string;
}

export async function sendChatMessage(
  message: string
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const data: ChatResponse = await response.json();

  if (
    !response.ok ||
    !data.success ||
    typeof data.reply !== "string"
  ) {
    throw new Error(data.error ?? "Failed to get an AI response");
  }

  return data.reply;
}
