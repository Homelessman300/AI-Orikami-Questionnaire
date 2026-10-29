/**
 * 
 * This is the main entry point for the Orikami AI backend server.
 * features:
 * - Provides API endpoints for health checks, Ollama status, and chat functionality.
 * - Handles incoming chat messages and forwards them to the Ollama AI model.
 * - Returns AI-generated responses to the client.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  askOllama, type ChatMessage,
} from "./ai/ollama.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// Middleware must be registered before routes
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Check whether the backend is running
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Orikami AI Backend is running",
  });
});

// Check whether Ollama is reachable
app.get("/api/ollama/status", async (_req, res) => {
  try {
    const ollamaUrl =
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434";

    const response = await fetch(`${ollamaUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();

    res.json({
      connected: true,
      configuredModel: process.env.OLLAMA_MODEL ?? "qwen3:14b",
      models: data.models,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Ollama status error:", message);

    res.status(503).json({
      connected: false,
      error: "Cannot connect to Ollama",
      details: message,
    });
  }
});

// Send a message to Ollama
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      !Array.isArray(history) ||
      !history.every(
        (item: ChatMessage) =>
          item &&
          (item.role === "user" ||
            item.role === "assistant") &&
          typeof item.content === "string"
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid chat message or history",
      });
    }

    const reply = await askOllama([
      ...history,
      {
        role: "user",
        content: message.trim(),
      },
    ]);

    return res.json({
      success: true,
      model: process.env.OLLAMA_MODEL ?? "qwen3:14b",
      reply,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate AI response",
    });
  }
});


 // Homepage route
app.get("/", (_req, res) => {
  res.json({
    name: "Orikami AI Backend",
    status: "running",
    model: process.env.OLLAMA_MODEL ?? "qwen3:14b",
    endpoints: [
      "GET /api/health",
      "GET /api/ollama/status",
      "POST /api/chat",
    ],
  });
});

// Start backend server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
