
import { describe, it, expect } from "vitest";

import {
  validateSchedule,
  type ScheduleConfig,
} from "../../src/services/schedules";

const validSchedule: ScheduleConfig = {
  frequency: "weekly",
  startDate: "2026-11-01",
  endDate: "2026-12-31",
  availableAt: "09:00",
  weekdays: [1, 5],
  specificDates: [],
  remindersEnabled: true,
  reminderFrequency: "daily",
  timezone: "Europe/Amsterdam",
};

describe("Schedule Validation - Unit Tests", () => {
  it("UT01: accepts a valid schedule", () => {
    const result = validateSchedule(validSchedule);

    expect(result).toEqual([]);
  });

  it("UT02: rejects a weekly schedule without weekdays", () => {
    const result = validateSchedule({
      ...validSchedule,
      weekdays: [],
    });

    expect(result).toContain("Select at least one weekday.");
  });

  it("UT03: rejects an end date before the start date", () => {
    const result = validateSchedule({
      ...validSchedule,
      startDate: "2026-12-31",
      endDate: "2026-11-01",
    });

    expect(result).toContain(
      "End date must be after start date."
    );
  });

  it("UT04: rejects an invalid schedule frequency", () => {
    const result = validateSchedule({
      ...validSchedule,
      frequency: "yearly",
    });

    expect(result).toContain("Invalid schedule frequency.");
  });

  it("UT05: rejects an invalid availability time", () => {
    const result = validateSchedule({
      ...validSchedule,
      availableAt: "25:99",
    });

    expect(result).toContain("Invalid availability time.");
  });

  it("UT06: rejects an invalid reminder frequency", () => {
    const result = validateSchedule({
      ...validSchedule,
      reminderFrequency: "hourly",
    });

    expect(result).toContain("Invalid reminder frequency.");
  });

  it("UT07: rejects specific frequency without dates", () => {
    const result = validateSchedule({
      ...validSchedule,
      frequency: "specific",
      specificDates: [],
    });

    expect(result).toContain(
      "Add at least one specific date."
    );
  });

  it("UT08: rejects specific dates outside the schedule period", () => {
    const result = validateSchedule({
      ...validSchedule,
      frequency: "specific",
      specificDates: ["2027-01-15"],
    });

    expect(result).toContain(
      "Specific dates must be within the schedule period."
    );
  });

  it("UT09: rejects an invalid timezone", () => {
    const result = validateSchedule({
      ...validSchedule,
      timezone: "UTC",
    });

    expect(result).toContain(
      "Timezone must be Europe/Amsterdam."
    );
  });

  it("UT10: rejects null instead of a schedule object", () => {
    const result = validateSchedule(null);

    expect(result).toContain("Schedule must be an object.");
  });
});
