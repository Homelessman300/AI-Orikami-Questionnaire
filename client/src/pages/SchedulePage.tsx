
/**
 * File: SchedulePage.tsx
 *
 * Purpose:
 * Configure questionnaire frequency, availability,
 * and reminder settings.
 *
 * Features:
 * - Manual schedule configuration
 * - AI extraction from chat history
 * - Schedule validation
 * - Save configuration to backend
 * - Local storage persistence
 */

import { useState } from "react";

import {
  defaultSchedule,
  type ScheduleConfig,
  type ScheduleFrequency,
  type ReminderFrequency,
} from "../types/schedule";

import {
  extractScheduleFromChat,
  type ChatMessage,
} from "../services/api";

import "../style/shedule.css";

const STORAGE_KEY = "orikami-schedule";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

type SchedulePageProps = {
  messages: ChatMessage[];
};

/**
 * Load the last locally saved schedule.
 */
function loadSchedule(): ScheduleConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return {
        ...defaultSchedule,
        ...JSON.parse(saved),
      };
    }
  } catch {
    console.error("Could not load saved schedule.");
  }

  return { ...defaultSchedule };
}

export default function SchedulePage({
  messages,
}: SchedulePageProps) {
  const [schedule, setSchedule] = useState<ScheduleConfig>(
    loadSchedule
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [specificDateInput, setSpecificDateInput] =
    useState("");

  // AI extraction states
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] =
    useState("");
  const [missingFields, setMissingFields] = useState<
    string[]
  >([]);

  /**
   * Update a schedule field.
   */
  function updateSchedule<K extends keyof ScheduleConfig>(
    field: K,
    value: ScheduleConfig[K]
  ) {
    setSchedule((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
    setErrors([]);
  }

  /**
   * Toggle a weekday.
   */
  function toggleWeekday(day: number) {
    const updated = schedule.weekdays.includes(day)
      ? schedule.weekdays.filter((value) => value !== day)
      : [...schedule.weekdays, day];

    updateSchedule("weekdays", updated);
  }

  /**
   * Add a specific availability date.
   */
  function addSpecificDate() {
    if (!specificDateInput) return;

    if (schedule.specificDates.includes(specificDateInput)) {
      return;
    }

    updateSchedule(
      "specificDates",
      [...schedule.specificDates, specificDateInput].sort()
    );

    setSpecificDateInput("");
  }

  /**
   * Remove a specific availability date.
   */
  function removeSpecificDate(date: string) {
    updateSchedule(
      "specificDates",
      schedule.specificDates.filter(
        (value) => value !== date
      )
    );
  }

  /**
   * Extract schedule settings from AI Chat.
   *
   * Generated settings are applied to the form
   * but are NOT saved automatically.
   */
  async function handleGenerateFromChat() {
    if (messages.length === 0) {
      setExtractionMessage(
        "Describe your questionnaire schedule in AI Chat first."
      );
      return;
    }

    setIsExtracting(true);
    setExtractionMessage("");
    setMissingFields([]);
    setErrors([]);

    try {
      const result = await extractScheduleFromChat(messages);
      const extracted = result.schedule;

      setSchedule((current) => ({
        ...current,

        ...(extracted.frequency
          ? { frequency: extracted.frequency }
          : {}),

        ...(extracted.startDate
          ? { startDate: extracted.startDate }
          : {}),

        ...(extracted.endDate
          ? { endDate: extracted.endDate }
          : {}),

        ...(extracted.availableAt
          ? { availableAt: extracted.availableAt }
          : {}),

        ...(extracted.weekdays !== undefined
          ? { weekdays: extracted.weekdays }
          : {}),

        ...(extracted.specificDates !== undefined
          ? { specificDates: extracted.specificDates }
          : {}),

        ...(extracted.remindersEnabled !== undefined
          ? {
              remindersEnabled:
                extracted.remindersEnabled,
            }
          : {}),

        ...(extracted.reminderFrequency !== undefined
          ? {
              reminderFrequency:
                extracted.reminderFrequency,
            }
          : {}),
      }));

      setSaved(false);
      setMissingFields(result.missingFields);

      if (result.status === "complete") {
        setExtractionMessage(
          "Schedule generated successfully. Review the settings before saving."
        );
      } else {
        setExtractionMessage(
          "Schedule partially generated. Please complete or correct the missing information."
        );
      }
    } catch (error) {
      setExtractionMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate schedule."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  /**
   * Validate the current schedule form.
   */
  function validateSchedule(): string[] {
    const validationErrors: string[] = [];

    if (!schedule.startDate) {
      validationErrors.push("Start date is required.");
    }

    if (!schedule.endDate) {
      validationErrors.push("End date is required.");
    }

    if (
      schedule.startDate &&
      schedule.endDate &&
      schedule.endDate < schedule.startDate
    ) {
      validationErrors.push(
        "End date cannot be earlier than start date."
      );
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(
        schedule.availableAt
      )
    ) {
      validationErrors.push(
        "Enter a valid availability time."
      );
    }

    if (
      schedule.frequency === "weekly" &&
      schedule.weekdays.length === 0
    ) {
      validationErrors.push(
        "Select at least one weekday."
      );
    }

    if (
      schedule.frequency === "specific" &&
      schedule.specificDates.length === 0
    ) {
      validationErrors.push(
        "Add at least one specific date."
      );
    }

    if (
      schedule.frequency === "specific" &&
      schedule.specificDates.some(
        (date) =>
          date < schedule.startDate ||
          date > schedule.endDate
      )
    ) {
      validationErrors.push(
        "Specific dates must be within the schedule period."
      );
    }

    return validationErrors;
  }

  /**
   * Save the confirmed schedule to the backend.
   */
  async function handleSave() {
    const validationErrors = validateSchedule();

    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setSaved(false);

    try {
      const response = await fetch(
        "http://localhost:3000/api/schedule",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ schedule }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrors(
          Array.isArray(result.errors)
            ? result.errors
            : [
                result.error ??
                  "Failed to save schedule.",
              ]
        );
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(schedule)
      );

      setSaved(true);
      setMissingFields([]);
      setExtractionMessage("");
    } catch (error) {
      console.error("Schedule save failed:", error);

      setErrors([
        "Cannot connect to the backend server.",
      ]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="schedule-page">
      {/* Page header */}
      <header className="schedule-page-header">
        <h1>Schedule & Reminders</h1>

        <p>
          Configure when participants can access
          questionnaires and when they should receive
          reminders.
        </p>
      </header>

      {/* AI generation */}
      <section className="schedule-section schedule-ai-section">
        <h2>Generate Schedule with AI</h2>

        <p>
          Describe the questionnaire schedule in AI Chat,
          then generate the configuration automatically.
        </p>

        <button
          type="button"
          className="schedule-ai-button"
          onClick={handleGenerateFromChat}
          disabled={
            isExtracting ||
            isSaving ||
            messages.length === 0
          }
        >
          {isExtracting
            ? "Generating Schedule..."
            : "Generate from AI Chat"}
        </button>

        {messages.length === 0 && (
          <p className="schedule-ai-hint">
            No chat messages yet. Describe your schedule
            in AI Chat first.
          </p>
        )}

        {extractionMessage && (
          <p
            className="schedule-ai-message"
            role="status"
          >
            {extractionMessage}
          </p>
        )}

        {missingFields.length > 0 && (
          <div
            className="schedule-ai-missing"
            role="alert"
          >
            <strong>
              Missing or invalid information:
            </strong>

            <ul>
              {missingFields.map((field, index) => (
                <li key={`${field}-${index}`}>
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Questionnaire scheduling */}
      <section className="schedule-section">
        <h2>Questionnaire Schedule</h2>

        <div className="schedule-field">
          <label htmlFor="schedule-frequency">
            Questionnaire frequency
          </label>

          <select
            id="schedule-frequency"
            value={schedule.frequency}
            onChange={(event) =>
              updateSchedule(
                "frequency",
                event.target.value as ScheduleFrequency
              )
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="specific">
              Specific dates
            </option>
          </select>
        </div>

        {/* Weekly schedule */}
        {schedule.frequency === "weekly" && (
          <div className="schedule-field">
            <label>Days of the week</label>

            <div className="schedule-weekdays">
              {weekdays.map((day) => (
                <label
                  className="schedule-checkbox"
                  key={day.value}
                >
                  <input
                    type="checkbox"
                    checked={schedule.weekdays.includes(
                      day.value
                    )}
                    onChange={() =>
                      toggleWeekday(day.value)
                    }
                  />

                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Specific dates */}
        {schedule.frequency === "specific" && (
          <div className="schedule-field">
            <label htmlFor="specific-date">
              Specific availability dates
            </label>

            <div className="schedule-date-add">
              <input
                id="specific-date"
                type="date"
                value={specificDateInput}
                onChange={(event) =>
                  setSpecificDateInput(
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                onClick={addSpecificDate}
              >
                Add date
              </button>
            </div>

            <div className="schedule-date-list">
              {schedule.specificDates.map((date) => (
                <div
                  className="schedule-date-item"
                  key={date}
                >
                  <span>{date}</span>

                  <button
                    type="button"
                    onClick={() =>
                      removeSpecificDate(date)
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability dates */}
        <div className="schedule-date-grid">
          <div className="schedule-field">
            <label htmlFor="schedule-start">
              Start date
            </label>

            <input
              id="schedule-start"
              type="date"
              value={schedule.startDate}
              onChange={(event) =>
                updateSchedule(
                  "startDate",
                  event.target.value
                )
              }
            />
          </div>

          <div className="schedule-field">
            <label htmlFor="schedule-end">
              End date
            </label>

            <input
              id="schedule-end"
              type="date"
              value={schedule.endDate}
              onChange={(event) =>
                updateSchedule(
                  "endDate",
                  event.target.value
                )
              }
            />
          </div>
        </div>

        {/* Availability time */}
        <div className="schedule-field">
          <label htmlFor="schedule-time">
            Available at
          </label>

          <input
            id="schedule-time"
            type="time"
            value={schedule.availableAt}
            onChange={(event) =>
              updateSchedule(
                "availableAt",
                event.target.value
              )
            }
          />
        </div>
      </section>

      {/* Reminder configuration */}
      <section className="schedule-section">
        <h2>Reminders</h2>

        <label className="schedule-checkbox">
          <input
            type="checkbox"
            checked={schedule.remindersEnabled}
            onChange={(event) =>
              updateSchedule(
                "remindersEnabled",
                event.target.checked
              )
            }
          />

          Enable questionnaire reminders
        </label>

        {schedule.remindersEnabled && (
          <div className="schedule-field schedule-reminder-field">
            <label htmlFor="reminder-frequency">
              Reminder frequency
            </label>

            <select
              id="reminder-frequency"
              value={schedule.reminderFrequency}
              onChange={(event) =>
                updateSchedule(
                  "reminderFrequency",
                  event.target.value as ReminderFrequency
                )
              }
            >
              <option value="once">
                Once when questionnaire is available
              </option>

              <option value="daily">
                Daily
              </option>

              <option value="weekly">
                Weekly
              </option>
            </select>
          </div>
        )}
      </section>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div
          className="schedule-errors"
          role="alert"
        >
          <strong>
            Please fix the following:
          </strong>

          <ul>
            {errors.map((error, index) => (
              <li key={`${error}-${index}`}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save success */}
      {saved && (
        <p
          className="schedule-success"
          role="status"
        >
          Schedule configuration saved successfully.
        </p>
      )}

      {/* Save action */}
      <div className="schedule-actions">
        <button
          type="button"
          className="schedule-save-button"
          onClick={handleSave}
          disabled={isSaving || isExtracting}
        >
          {isSaving
            ? "Saving..."
            : "Save Configuration"}
        </button>
      </div>
    </main>
  );
}
