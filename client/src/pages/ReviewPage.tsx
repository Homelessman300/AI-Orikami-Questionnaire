
import { useEffect, useState } from "react";

import type { ProjectConfig } from "../types/project";
import type { ScheduleConfig } from "../types/schedule";
import type { FhirQuestionnaire } from "../services/api";

import { validateProject } from "../services/api";

import "../style/review.css";

const SCHEDULE_STORAGE_KEY = "orikami-schedule";

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type ReviewPageProps = {
  project: ProjectConfig;
  questionnaire: FhirQuestionnaire | null;
  onNavigate: (
    page: "project" | "questionnaire" | "schedule"
  ) => void;
};

function loadSavedSchedule(): ScheduleConfig | null {
  try {
    const stored = localStorage.getItem(
      SCHEDULE_STORAGE_KEY
    );

    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed as ScheduleConfig;
  } catch {
    return null;
  }
}

export default function ReviewPage({
  project,
  questionnaire,
  onNavigate,
}: ReviewPageProps) {
  const [schedule, setSchedule] =
    useState<ScheduleConfig | null>(
      loadSavedSchedule
    );

  const [validationErrors, setValidationErrors] =
    useState<string[]>([]);

  const [isValidating, setIsValidating] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(false);

  const [confirmationError, setConfirmationError] =
    useState("");

  // Refresh the locally saved schedule when
  // the Review page is opened.
  useEffect(() => {
    setSchedule(loadSavedSchedule());
  }, []);

  // Revoke local confirmation when inputs change.
  useEffect(() => {
    setConfirmed(false);
  }, [project, questionnaire, schedule]);

  const questionnaireItems =
    questionnaire?.item ?? [];

  const questionnaireTitle =
    questionnaire?.title || "Untitled questionnaire";

  const projectName =
    project.name?.trim() || "Not configured";

  const projectDescription =
    project.description?.trim() || "Not provided";

  const startDate =
    project.startDate || "Not configured";

  const endDate =
    project.endDate || "Not configured";

  const scheduleFrequency =
    schedule?.frequency || "Not configured";

  const selectedWeekdays =
    schedule?.weekdays
      ?.map((day) => weekdayNames[day])
      .filter(Boolean)
      .join(", ") || "None";

  const hasProject =
    Boolean(project.name?.trim()) &&
    Boolean(project.startDate) &&
    Boolean(project.endDate) &&
    project.selfEnrollment !== null &&
    project.selfEnrollment !== undefined;

  const hasQuestionnaire =
    questionnaire?.resourceType === "Questionnaire" &&
    questionnaireItems.length > 0;

  const hasSchedule = schedule !== null;

  const canAttemptConfirmation =
    hasProject &&
    hasQuestionnaire &&
    hasSchedule &&
    !isValidating;

  async function handleConfirm() {
    setValidationErrors([]);
    setConfirmationError("");
    setConfirmed(false);

    const errors: string[] = [];

    if (!hasProject) {
      errors.push(
        "Project configuration is incomplete."
      );
    }

    if (
      project.startDate &&
      project.endDate &&
      project.endDate < project.startDate
    ) {
      errors.push(
        "Project end date cannot be earlier than its start date."
      );
    }

    if (!hasQuestionnaire) {
      errors.push(
        "A valid FHIR Questionnaire with at least one question is required."
      );
    }

    if (!schedule) {
      errors.push(
        "Save the schedule configuration before confirming."
      );
    } else {
      if (!schedule.startDate || !schedule.endDate) {
        errors.push(
          "Schedule start and end dates are required."
        );
      }

      if (
        schedule.startDate &&
        schedule.endDate &&
        schedule.endDate < schedule.startDate
      ) {
        errors.push(
          "Schedule end date cannot be earlier than its start date."
        );
      }

      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
          schedule.availableAt
        )
      ) {
        errors.push(
          "Schedule availability time is invalid."
        );
      }

      if (
        schedule.frequency === "weekly" &&
        schedule.weekdays.length === 0
      ) {
        errors.push(
          "Select at least one weekday."
        );
      }

      if (
        schedule.frequency === "specific" &&
        schedule.specificDates.length === 0
      ) {
        errors.push(
          "Add at least one specific date."
        );
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsValidating(true);

    try {
      // Reuse the existing backend project validation.
      const result = await validateProject(project);

      // Handle either common API validation format:
      // { valid: boolean, errors?: string[] }
      // or { isValid: boolean, errors?: string[] }
      const response = result as {
        valid?: boolean;
        isValid?: boolean;
        errors?: string[];
      };

      if (
        response.valid !== true &&
        response.isValid !== true
      ) {
        setValidationErrors(
          response.errors?.length
            ? response.errors
            : ["Project validation did not pass."]
        );
        return;
      }

      // Local PoC confirmation only.
      // No KRANE API call is made here.
      setConfirmed(true);
    } catch (error) {
      setConfirmationError(
        error instanceof Error
          ? error.message
          : "Could not validate the configuration."
      );
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <main className="review-page">
      <header className="review-header">
        <h1>Review & Confirmation</h1>

        <p>
          Review your project, questionnaire, and
          scheduling settings before confirming.
        </p>
      </header>

      <section className="review-section">
        <div className="review-section-header">
          <h2>Project Details</h2>

          <button
            type="button"
            className="review-edit-button"
            onClick={() => onNavigate("project")}
          >
            Edit Project
          </button>
        </div>

        <dl className="review-details">
          <div>
            <dt>Project name</dt>
            <dd>{projectName}</dd>
          </div>

          <div>
            <dt>Description</dt>
            <dd>{projectDescription}</dd>
          </div>

          <div>
            <dt>Start date</dt>
            <dd>{startDate}</dd>
          </div>

          <div>
            <dt>End date</dt>
            <dd>{endDate}</dd>
          </div>

          <div>
            <dt>Self-enrollment</dt>
            <dd>
              {project.selfEnrollment === null ||
              project.selfEnrollment === undefined
                ? "Not configured"
                : project.selfEnrollment
                  ? "Enabled"
                  : "Disabled"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="review-section">
        <div className="review-section-header">
          <h2>FHIR Questionnaire</h2>

          <button
            type="button"
            className="review-edit-button"
            onClick={() =>
              onNavigate("questionnaire")
            }
          >
            Edit Questionnaire
          </button>
        </div>

        {questionnaire ? (
          <>
            <dl className="review-details">
              <div>
                <dt>Title</dt>
                <dd>{questionnaireTitle}</dd>
              </div>

              <div>
                <dt>Resource type</dt>
                <dd>
                  {questionnaire.resourceType}
                </dd>
              </div>

              <div>
                <dt>Top-level questions</dt>
                <dd>{questionnaireItems.length}</dd>
              </div>
            </dl>

            <h3>Questions</h3>

            <ol className="review-question-list">
              {questionnaireItems.map(
                (item, index) => (
                  <li
                    key={
                      item.linkId ||
                      String(index)
                    }
                  >
                    {item.text ||
                      `Question ${index + 1}`}
                  </li>
                )
              )}
            </ol>
          </>
        ) : (
          <p className="review-empty">
            No questionnaire has been generated.
          </p>
        )}
      </section>

      <section className="review-section">
        <div className="review-section-header">
          <h2>Schedule & Reminders</h2>

          <button
            type="button"
            className="review-edit-button"
            onClick={() => onNavigate("schedule")}
          >
            Edit Schedule
          </button>
        </div>

        {schedule ? (
          <dl className="review-details">
            <div>
              <dt>Frequency</dt>
              <dd>{scheduleFrequency}</dd>
            </div>

            {schedule.frequency === "weekly" && (
              <div>
                <dt>Weekdays</dt>
                <dd>{selectedWeekdays}</dd>
              </div>
            )}

            {schedule.frequency === "specific" && (
              <div>
                <dt>Specific dates</dt>
                <dd>
                  {schedule.specificDates.join(", ") ||
                    "None"}
                </dd>
              </div>
            )}

            <div>
              <dt>Start date</dt>
              <dd>{schedule.startDate}</dd>
            </div>

            <div>
              <dt>End date</dt>
              <dd>{schedule.endDate}</dd>
            </div>

            <div>
              <dt>Available at</dt>
              <dd>{schedule.availableAt}</dd>
            </div>

            <div>
              <dt>Timezone</dt>
              <dd>{schedule.timezone}</dd>
            </div>

            <div>
              <dt>Reminders</dt>
              <dd>
                {schedule.remindersEnabled
                  ? "Enabled"
                  : "Disabled"}
              </dd>
            </div>

            {schedule.remindersEnabled && (
              <div>
                <dt>Reminder frequency</dt>
                <dd>
                  {schedule.reminderFrequency}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="review-empty">
            No saved schedule found. Configure
            and save your schedule first.
          </p>
        )}
      </section>

      {validationErrors.length > 0 && (
        <div
          className="review-errors"
          role="alert"
        >
          <strong>
            Please resolve these issues:
          </strong>

          <ul>
            {validationErrors.map(
              (error, index) => (
                <li key={`${error}-${index}`}>
                  {error}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {confirmationError && (
        <div
          className="review-errors"
          role="alert"
        >
          {confirmationError}
        </div>
      )}

      {confirmed && (
        <div
          className="review-success"
          role="status"
        >
          Configuration confirmed successfully.
          This is a local PoC confirmation;
          no resources have been created in KRANE.
        </div>
      )}

      <div className="review-actions">
        <button
          type="button"
          className="review-confirm-button"
          onClick={handleConfirm}
          disabled={
            !canAttemptConfirmation ||
            confirmed
          }
        >
          {isValidating
            ? "Validating..."
            : confirmed
              ? "Confirmed"
              : "Confirm Configuration"}
        </button>
      </div>
    </main>
  );
}
