
import "dotenv/config";

const OLLAMA_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

const MODEL =
  process.env.OLLAMA_MODEL ?? "qwen3:14b";

export async function askOllama(prompt: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Ollama error:", message);
    throw new Error(`Failed to communicate with Ollama: ${message}`);
  }
  

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Ollama HTTP ${response.status}: ${details}`
    );
  }

  const data = await response.json();

  return data.response;
}
