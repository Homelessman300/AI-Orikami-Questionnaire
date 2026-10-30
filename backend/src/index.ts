
/**
 * Main entry point for the Orikami AI backend server.
 *
 * Features:
 * - Health check
 * - Ollama connection status
 * - AI chat
 * - Project extraction and validation
 * - FHIR Questionnaire generation and validation
 * - In-app notifications
 * - Automatic notification scheduler
 * - Development-only notification testing
 */

import "dotenv/config";
import express from "express";
import cors from "cors";

import {
  askOllama,
  type ChatMessage,
} from "./ai/ollama.ts";

import { extractProject } from "./ai/extractProject.ts";
import { validateProject } from "./validation/project.ts";
import { validateQuestionnaire } from "./validation/questionnaire.ts";
import { generateQuestionnaire } from "./ai/generateQuestionnaire.ts";
import { extractSchedule } from "./ai/extractSchedule.ts";

import {
  getNotifications,
  markNotificationRead,
  startNotificationScheduler,
  createNotification,
} from "./services/notifications.js";
import {
  getSchedule,
  saveSchedule,
  validateSchedule,
  type ScheduleConfig,
} from "./services/schedules.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

/**
 * Middleware
 */
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

/**
 * GET /api/health
 *
 * Check whether the backend is running.
 */
app.get("/api/health", (_req, res) => {
  return res.json({
    status: "ok",
    message: "Orikami AI Backend is running",
  });
});

/**
 * GET /api/ollama/status
 *
 * Check whether Ollama is reachable.
 */
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

    return res.json({
      connected: true,
      configuredModel:
        process.env.OLLAMA_MODEL ?? "qwen3:14b",
      models: data.models,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error("Ollama status error:", message);

    return res.status(503).json({
      connected: false,
      error: "Cannot connect to Ollama",
      details: message,
    });
  }
});

/**
 * POST /api/chat
 *
 * Send a message to Ollama.
 */
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
    console.error("Chat generation failed:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate AI response",
    });
  }
});

/**
 * GET /
 *
 * Backend information.
 */

/**
 * GET /
 *
 * Backend information and available API endpoints.
 */
app.get("/", (_req, res) => {
  return res.json({
    name: "Orikami AI Backend",
    status: "running",
    model: process.env.OLLAMA_MODEL ?? "qwen3:14b",
    endpoints: [
      "GET /api/health",
      "GET /api/ollama/status",
      "POST /api/chat",
      "POST /api/project/extract",
      "POST /api/project/validate",
      "POST /api/questionnaire/generate",
      "GET /api/schedule",
      "PUT /api/schedule",
      "GET /api/notifications",
      "PATCH /api/notifications/:id/read",

      ...(process.env.NODE_ENV !== "production"
        ? ["POST /api/notifications/test"]
        : []),
    ],
  });
});


/**
 * POST /api/project/extract
 *
 * Extract project configuration from AI Chat history.
 *
 * Does not save anything to KRANE.
 */
app.post("/api/project/extract", async (req, res) => {
  try {
    const { messages } = req.body;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.some(
        (message) =>
          typeof message !== "object" ||
          message === null ||
          !["user", "assistant"].includes(message.role) ||
          typeof message.content !== "string"
      )
    ) {
      return res.status(400).json({
        error: "Valid conversation history is required",
      });
    }

    const project = await extractProject(messages);

    return res.json({ project });
  } catch (error) {
    console.error("Project extraction failed:", error);

    return res.status(500).json({
      error: "Failed to extract project configuration",
    });
  }
});

/**
 * POST /api/project/validate
 *
 * Validate project configuration without saving it.
 */
app.post("/api/project/validate", (req, res) => {
  const project = req.body?.project;

  if (
    !project ||
    typeof project !== "object" ||
    Array.isArray(project) ||
    typeof project.name !== "string" ||
    typeof project.description !== "string" ||
    typeof project.startDate !== "string" ||
    typeof project.endDate !== "string" ||
    !(
      typeof project.selfEnrollment === "boolean" ||
      project.selfEnrollment === null
    )
  ) {
    return res.status(400).json({
      valid: false,
      errors: ["Invalid project configuration structure."],
    });
  }

  return res.json(validateProject(project));
});

/**
 * POST /api/questionnaire/generate
 *
 * Generate and validate a FHIR Questionnaire
 * using AI Chat history.
 *
 * Does not save anything to KRANE.
 */
app.post("/api/questionnaire/generate", async (req, res) => {
  try {
    const messages = req.body?.messages;

    if (
      !Array.isArray(messages) ||
      !messages.every(
        (message) =>
          message &&
          typeof message === "object" &&
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string"
      )
    ) {
      return res.status(400).json({
        error: "Invalid conversation messages.",
      });
    }

    const result = await generateQuestionnaire(messages);

    if (result.status === "needs_information") {
      return res.json(result);
    }

    const validation = validateQuestionnaire(
      result.questionnaire
    );

    if (!validation.valid) {
      return res.status(422).json({
        status: "invalid",
        errors: validation.errors,
      });
    }

    return res.json({
      status: "complete",
      questionnaire: result.questionnaire,
      validation,
    });
  } catch (error) {
    console.error(
      "Questionnaire generation failed:",
      error
    );

    return res.status(500).json({
      error: "Failed to generate questionnaire.",
    });
  }
});

/**
 * GET /api/notifications
 *
 * Retrieve notifications.
 */
app.get("/api/notifications", (_req, res) => {
  return res.json({
    notifications: getNotifications(),
  });
});

/**
 * POST /api/notifications/test
 *
 * Create a notification immediately for testing.
 *
 * This endpoint is only available outside production.
 * It should not be exposed to untrusted users.
 */
if (process.env.NODE_ENV !== "production") {
  app.post("/api/notifications/test", (_req, res) => {
    try {
      const notification = createNotification(
        "Questionnaire Reminder",
        "Your questionnaire is ready to complete."
      );

      return res.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "Test notification creation failed:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Failed to create test notification.",
      });
    }
  });
}

/**
 * PATCH /api/notifications/:id/read
 *
 * Mark an existing notification as read.
 */
app.patch("/api/notifications/:id/read", (req, res) => {
  try {
    const updated = markNotificationRead(req.params.id);

    if (!updated) {
      return res.status(404).json({
        error: "Notification not found",
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Failed to mark notification as read:",
      error
    );

    return res.status(500).json({
      error: "Failed to update notification.",
    });
  }
});


/**
 * GET /api/schedule
 *
 * Retrieve saved schedule configuration.
 */
app.get("/api/schedule", (_req, res) => {
  try {
    return res.json({
      schedule: getSchedule(),
    });
  } catch (error) {
    console.error("Failed to load schedule:", error);

    return res.status(500).json({
      error: "Failed to load schedule.",
    });
  }
});

/**
 * PUT /api/schedule
 * 
 * Validate and save schedule configuration.
 */
app.put("/api/schedule", (req, res) => {
  try {
    const errors = validateSchedule(
      req.body?.schedule
    );

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const schedule = saveSchedule(
      req.body.schedule as ScheduleConfig
    );

    return res.json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error("Failed to save schedule:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to save schedule.",
    });
  }
});

/**
 * POST /api/schedule/extract
 *
 * Extract schedule configuration using Ollama.
 * Does not save the schedule.
 */
app.post("/api/schedule/extract", async (req, res) => {
  try {
    const messages = req.body?.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      !messages.every(
        (message) =>
          message &&
          typeof message === "object" &&
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string"
      )
    ) {
      return res.status(400).json({
        error: "Valid conversation history is required.",
      });
    }

    const result = await extractSchedule(messages);

    return res.json(result);
  } catch (error) {
    console.error("Schedule extraction failed:", error);

    return res.status(500).json({
      error: "Failed to extract schedule configuration.",
    });
  }
});


/**
 * Start the notification scheduler.
 *
 * The current scheduler creates demonstration reminders.
 * Later, it will use saved questionnaire schedules.
 */
startNotificationScheduler();

// Export Express app for integration testing
export default app;

// Only start the server outside the test environment
if (process.env.NODE_ENV !== "test") {
  startNotificationScheduler();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}