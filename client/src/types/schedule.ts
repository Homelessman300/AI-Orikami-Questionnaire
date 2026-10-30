
export type ScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "specific";

export type ReminderFrequency =
  | "once"
  | "daily"
  | "weekly";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  startDate: string;
  endDate: string;
  availableAt: string;
  weekdays: number[];
  specificDates: string[];
  remindersEnabled: boolean;
  reminderFrequency: ReminderFrequency;
  timezone: string;
}

export const defaultSchedule: ScheduleConfig = {
  frequency: "daily",
  startDate: "",
  endDate: "",
  availableAt: "09:00",
  weekdays: [1],
  specificDates: [],
  remindersEnabled: false,
  reminderFrequency: "once",
  timezone: "Europe/Amsterdam",
};
