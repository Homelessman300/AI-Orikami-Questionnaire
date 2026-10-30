
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type ScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "specific";

export type ReminderFrequency =
  | "once"
  | "daily"
  | "weekly";

export type ScheduleConfig = {
  frequency: ScheduleFrequency;
  startDate: string;
  endDate: string;
  availableAt: string;
  weekdays: number[];
  specificDates: string[];
  remindersEnabled: boolean;
  reminderFrequency: ReminderFrequency;
  timezone: "Europe/Amsterdam";
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "schedule.json");

export function getSchedule(): ScheduleConfig | null {
  if (!existsSync(dataFile)) return null;

  return JSON.parse(
    readFileSync(dataFile, "utf8")
  ) as ScheduleConfig;
}

export function saveSchedule(
  schedule: ScheduleConfig
): ScheduleConfig {
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(
    dataFile,
    JSON.stringify(schedule, null, 2)
  );

  return schedule;
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validateSchedule(
  value: unknown
): string[] {
  const errors: string[] = [];

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return ["Schedule must be an object."];
  }

  const schedule = value as Record<string, unknown>;

  if (
    !["daily", "weekly", "monthly", "specific"].includes(
      String(schedule.frequency)
    )
  ) {
    errors.push("Invalid schedule frequency.");
  }

  if (!isValidDate(schedule.startDate)) {
    errors.push("Invalid start date.");
  }

  if (!isValidDate(schedule.endDate)) {
    errors.push("Invalid end date.");
  }

  if (
    isValidDate(schedule.startDate) &&
    isValidDate(schedule.endDate) &&
    schedule.endDate < schedule.startDate
  ) {
    errors.push("End date must be after start date.");
  }

  if (
    typeof schedule.availableAt !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      schedule.availableAt
    )
  ) {
    errors.push("Invalid availability time.");
  }

  if (
    !Array.isArray(schedule.weekdays) ||
    !schedule.weekdays.every(
      (day) =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    )
  ) {
    errors.push("Invalid weekdays.");
  } else if (
    schedule.frequency === "weekly" &&
    schedule.weekdays.length === 0
  ) {
    errors.push("Select at least one weekday.");
  }

  if (
    !Array.isArray(schedule.specificDates) ||
    !schedule.specificDates.every(isValidDate)
  ) {
    errors.push("Invalid specific dates.");
  } else if (schedule.frequency === "specific") {
    if (schedule.specificDates.length === 0) {
      errors.push("Add at least one specific date.");
    }

    if (
      isValidDate(schedule.startDate) &&
      isValidDate(schedule.endDate) &&
      schedule.specificDates.some(
        (date) =>
          date < schedule.startDate! ||
          date > schedule.endDate!
      )
    ) {
      errors.push(
        "Specific dates must be within the schedule period."
      );
    }
  }

  if (typeof schedule.remindersEnabled !== "boolean") {
    errors.push("Invalid reminders setting.");
  }

  if (
    !["once", "daily", "weekly"].includes(
      String(schedule.reminderFrequency)
    )
  ) {
    errors.push("Invalid reminder frequency.");
  }

  if (schedule.timezone !== "Europe/Amsterdam") {
    errors.push("Timezone must be Europe/Amsterdam.");
  }

  return errors;
}
