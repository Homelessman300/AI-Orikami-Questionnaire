
/**
 *
 * Purpose:
 * Displays and edits project configuration.
 *
 * Features:
 * - Automatically extracts project information from AI Chat.
 * - Displays extracted information in editable fields.
 * - Preserves manual changes when navigating between pages.
 * - Calculates project duration.
 * - Validates required project information.
 *
 * Does not save anything to KRANE.
 */

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  extractProject,
  type ChatMessage,
} from "../services/api";

import type { ProjectConfig } from "../types/project";

import "../style/projectPage.css";

type ProjectPageProps = {
  messages: ChatMessage[];
  project: ProjectConfig;
  onProjectChange: (project: ProjectConfig) => void;
  lastExtractedHistory: string;
  onHistoryExtracted: (history: string) => void;
};

export default function ProjectPage({
  messages,
  project,
  onProjectChange,
  lastExtractedHistory,
  onHistoryExtracted,
}: ProjectPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Prevent duplicate requests for the same conversation.
  const pendingHistory = useRef("");

  // Use stable conversation content as the extraction key.
  const historyKey = JSON.stringify(messages);

  /**
   * Automatically extract project information when:
   * - The page opens with a conversation.
   * - The conversation has changed since the last extraction.
   *
   * Does not extract if the user hasn't sent a message.
   */
  useEffect(() => {
    const hasUserMessage = messages.some(
      (message) => message.role === "user"
    );

    if (!hasUserMessage) {
      return;
    }

    if (
      historyKey === lastExtractedHistory ||
      historyKey === pendingHistory.current
    ) {
      return;
    }

    pendingHistory.current = historyKey;

    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const extracted = await extractProject(
          JSON.parse(historyKey) as ChatMessage[]
        );

        if (cancelled) return;

        onProjectChange(extracted);
        onHistoryExtracted(historyKey);

        setSuccess(
          "Project information loaded from AI Chat."
        );
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to extract project information."
        );
      } finally {
        if (!cancelled) {
          pendingHistory.current = "";
          setLoading(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
      pendingHistory.current = "";
    };
  }, [
    historyKey,
    lastExtractedHistory,
    onProjectChange,
    onHistoryExtracted,
  ]);

  /**
   * Updates a project field while preserving other fields.
   */
  function updateField<K extends keyof ProjectConfig>(
    field: K,
    value: ProjectConfig[K]
  ) {
    onProjectChange({
      ...project,
      [field]: value,
    });

    setError("");
    setSuccess("");
  }

  /**
   * Calculate project duration in calendar days.
   */
  const duration =
    project.startDate && project.endDate
      ? Math.round(
          (
            Date.parse(project.endDate) -
            Date.parse(project.startDate)
          ) / 86400000
        )
      : null;

  /**
   * Validate project information locally.
   * This does not submit anything to KRANE.
   */
  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!project.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!project.startDate || !project.endDate) {
      setError("Start date and end date are required.");
      return;
    }

    const today = new Date();

    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    if (project.startDate < todayString) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (project.endDate <= project.startDate) {
      setError("End date must be after start date.");
      return;
    }

    if (project.selfEnrollment === null) {
      setError(
        "Please select a self-enrollment option."
      );
      return;
    }

    setError("");
    setSuccess("Project configuration is valid.");
  }

  /**
   * Clear project fields.
   *
   * The last extraction key is preserved, so clearing
   * does not immediately trigger another AI request.
   */
  function handleClear() {
    onProjectChange({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      selfEnrollment: null,
    });

    setError("");
    setSuccess("");
  }

  return (
    <div className="project-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            ORIKAMI AI BUILDER
          </span>

          <h1>Project Configuration</h1>

          <p>
            Review and edit the project information
            collected by the AI assistant.
          </p>
        </div>
      </header>

      <main className="project-panel">
        <div className="project-panel-header">
          <div>
            <h2>Project Details</h2>

            <p>
              Complete the required information
              before continuing.
            </p>
          </div>

          {loading && (
            <p role="status">
              Extracting project information...
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="project-field">
            <label htmlFor="project-name">
              Project Name *
            </label>

            <input
              id="project-name"
              type="text"
              value={project.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="project-field">
            <label htmlFor="project-description">
              Description
            </label>

            <textarea
              id="project-description"
              value={project.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe your project"
              rows={4}
            />
          </div>

          <div className="project-date-row">
            <div className="project-field">
              <label htmlFor="project-start">
                Start Date *
              </label>

              <input
                id="project-start"
                type="date"
                value={project.startDate}
                onChange={(event) =>
                  updateField(
                    "startDate",
                    event.target.value
                  )
                }
                required
              />
            </div>

            <div className="project-field">
              <label htmlFor="project-end">
                End Date *
              </label>

              <input
                id="project-end"
                type="date"
                value={project.endDate}
                onChange={(event) =>
                  updateField(
                    "endDate",
                    event.target.value
                  )
                }
                required
              />
            </div>
          </div>

          <div className="project-field">
            <label>Duration</label>

            <p className="project-duration">
              {duration !== null && duration > 0
                ? `${duration} days`
                : "Select valid start and end dates"}
            </p>
          </div>

          <fieldset className="project-field">
            <legend>Self-enrollment *</legend>

            <label>
              <input
                type="radio"
                name="selfEnrollment"
                checked={
                  project.selfEnrollment === true
                }
                onChange={() =>
                  updateField(
                    "selfEnrollment",
                    true
                  )
                }
              />
              Enabled
            </label>

            <label>
              <input
                type="radio"
                name="selfEnrollment"
                checked={
                  project.selfEnrollment === false
                }
                onChange={() =>
                  updateField(
                    "selfEnrollment",
                    false
                  )
                }
              />
              Disabled
            </label>
          </fieldset>

          {error && (
            <p
              className="project-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="project-success"
              role="status"
            >
              {success}
            </p>
          )}

          {!loading &&
            !messages.some(
              (message) =>
                message.role === "user"
            ) && (
              <p className="project-error">
                No conversation available to extract.
                Describe your project in AI Chat first.
              </p>
            )}

          <div className="project-actions">
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={loading}
            >
              Validate Project
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
