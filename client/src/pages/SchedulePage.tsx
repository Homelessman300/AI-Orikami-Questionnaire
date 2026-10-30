
import { useState } from "react";
import {
  defaultSchedule,
  type ScheduleConfig,
  type ScheduleFrequency,
  type ReminderFrequency,
} from "../types/schedule";
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

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleConfig>(
    loadSchedule
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [specificDateInput, setSpecificDateInput] = useState("");

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

  function toggleWeekday(day: number) {
    const updated = schedule.weekdays.includes(day)
      ? schedule.weekdays.filter((value) => value !== day)
      : [...schedule.weekdays, day];

    updateSchedule("weekdays", updated);
  }

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

  function removeSpecificDate(date: string) {
    updateSchedule(
      "specificDates",
      schedule.specificDates.filter((value) => value !== date)
    );
  }

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

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.availableAt)) {
      validationErrors.push("Enter a valid availability time.");
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

 
async function handleSave() {
  const validationErrors = validateSchedule();

  setErrors(validationErrors);

  if (validationErrors.length > 0) {
    setSaved(false);
    return;
  }

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
        result.errors ??
          [result.error ?? "Failed to save schedule."]
      );
      setSaved(false);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(schedule)
    );

    setSaved(true);
  } catch (error) {
    console.error("Schedule save failed:", error);

    setErrors([
      "Cannot connect to the backend server.",
    ]);

    setSaved(false);
  }
}


  return (
    <main className="schedule-page">
      <header className="schedule-page-header">
        <h1>Schedule & Reminders</h1>
        <p>
          Configure when participants can access questionnaires
          and when they should receive reminders.
        </p>
      </header>

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
            <option value="specific">Specific dates</option>
          </select>
        </div>

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
                  setSpecificDateInput(event.target.value)
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
          <div className="schedule-field">
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

      {errors.length > 0 && (
        <div className="schedule-errors" role="alert">
          <strong>Please fix the following:</strong>

          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {saved && (
        <p className="schedule-success" role="status">
          Schedule configuration saved successfully.
        </p>
      )}

      <div className="schedule-actions">
        <button
          type="button"
          className="schedule-save-button"
          onClick={handleSave}
        >
          Save Configuration
        </button>
      </div>
    </main>
  );
}
