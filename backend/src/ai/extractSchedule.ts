
/**
 * Purpose:
 * Extracts questionnaire schedule configuration
 * from an AI conversation.
 *
 * Missing values remain empty.
 * No schedule is saved automatically.
 */

import {
  askOllama,
  type ChatMessage,
} from "./ollama.ts";

import {
  validateSchedule,
  type ScheduleConfig,
} from "../services/schedules.ts";

export type ScheduleExtractionResult =
  | {
      status: "complete";
      schedule: ScheduleConfig;
      missingFields: string[];
    }
  | {
      status: "needs_information";
      schedule: Partial<ScheduleConfig>;
      missingFields: string[];
    };

/**
 * Extracts schedule information from conversation history.
 */
export async function extractSchedule(
  messages: ChatMessage[]
): Promise<ScheduleExtractionResult> {
  const extractionPrompt = `
You are a questionnaire schedule extraction assistant
for the Orikami AI Builder.

Extract scheduling information from the conversation.

Return ONLY valid JSON with this structure:

{
  "frequency": "",
  "startDate": "",
  "endDate": "",
  "availableAt": "",
  "weekdays": [],
  "specificDates": [],
  "remindersEnabled": false,
  "reminderFrequency": "once",
  "timezone": "Europe/Amsterdam"
}

Rules:
- Only extract information supplied by the user.
- Do not invent missing dates, times, or frequencies.
- If the user corrects a previous value, use the latest value.
- frequency must be daily, weekly, monthly, or specific.
- Missing frequency must be an empty string.
- Dates must use YYYY-MM-DD.
- Missing dates must be empty strings.
- Time must use HH:mm (24-hour format).
- Missing time must be an empty string.
- Weekdays use Sunday=0, Monday=1, Tuesday=2,
  Wednesday=3, Thursday=4, Friday=5, Saturday=6.
- For weekly schedules, include selected weekdays.
- For specific dates, include all specified dates.
- If reminders are not mentioned, set
  remindersEnabled to false.
- reminderFrequency must be once, daily, or weekly.
- If reminder frequency is not specified, use once.
- timezone must be Europe/Amsterdam.
- For monthly schedules, the start date determines
  the day of the month.
- Do not include Markdown.
- Do not include explanations.
- Return valid JSON only.
`;

  const response = await askOllama([
    {
      role: "system",
      content: extractionPrompt,
    },
    ...messages.filter(
      (message) => message.role !== "system"
    ),
    {
      role: "user",
      content:
        "Extract the questionnaire schedule as JSON.",
    },
  ]);

  /**
   * Remove optional Markdown code fences.
   */
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const parsed: unknown = JSON.parse(cleaned);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Invalid schedule extraction response."
    );
  }

  const data = parsed as Record<string, unknown>;

  /**
   * Normalize the AI response.
   */
  const schedule: Partial<ScheduleConfig> = {
    ...(typeof data.frequency === "string" &&
    ["daily", "weekly", "monthly", "specific"].includes(
      data.frequency
    )
      ? {
          frequency:
            data.frequency as ScheduleConfig["frequency"],
        }
      : {}),

    startDate:
      typeof data.startDate === "string"
        ? data.startDate
        : "",

    endDate:
      typeof data.endDate === "string"
        ? data.endDate
        : "",

    availableAt:
      typeof data.availableAt === "string"
        ? data.availableAt
        : "",

    weekdays: Array.isArray(data.weekdays)
      ? data.weekdays.filter(
          (day): day is number =>
            typeof day === "number" &&
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        )
      : [],

    specificDates: Array.isArray(data.specificDates)
      ? data.specificDates.filter(
          (date): date is string =>
            typeof date === "string"
        )
      : [],

    remindersEnabled:
      typeof data.remindersEnabled === "boolean"
        ? data.remindersEnabled
        : false,

    reminderFrequency:
      data.reminderFrequency === "daily" ||
      data.reminderFrequency === "weekly"
        ? data.reminderFrequency
        : "once",

    timezone: "Europe/Amsterdam",
  };

  /**
   * Identify missing information.
   */
  const missingFields: string[] = [];

  if (!schedule.frequency) {
    missingFields.push("frequency");
  }

  if (!schedule.startDate) {
    missingFields.push("startDate");
  }

  if (!schedule.endDate) {
    missingFields.push("endDate");
  }

  if (!schedule.availableAt) {
    missingFields.push("availableAt");
  }

  if (
    schedule.frequency === "weekly" &&
    !schedule.weekdays?.length
  ) {
    missingFields.push("weekdays");
  }

  if (
    schedule.frequency === "specific" &&
    !schedule.specificDates?.length
  ) {
    missingFields.push("specificDates");
  }

  if (missingFields.length > 0) {
    return {
      status: "needs_information",
      schedule,
      missingFields,
    };
  }

  /**
   * Validate the completed schedule.
   */
  const errors = validateSchedule(schedule);

  if (errors.length > 0) {
    return {
      status: "needs_information",
      schedule,
      missingFields: errors,
    };
  }

  return {
    status: "complete",
    schedule: schedule as ScheduleConfig,
    missingFields: [],
  };
}
