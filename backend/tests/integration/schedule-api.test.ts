
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "vitest";
import request from "supertest";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";

import app from "../../src/index";
import type { ScheduleConfig } from "../../src/services/schedules";

// The backend currently stores schedules in data/schedule.json.
// Back up the original file so tests do not permanently replace it.
const scheduleFile = path.resolve(
  process.cwd(),
  "data",
  "schedule.json"
);

let originalSchedule: Buffer | null = null;
let scheduleExisted = false;

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

describe("Schedule API - Integration Tests", () => {
  beforeAll(() => {
    scheduleExisted = existsSync(scheduleFile);

    if (scheduleExisted) {
      originalSchedule = readFileSync(scheduleFile);
    }
  });

  afterAll(() => {
    if (scheduleExisted && originalSchedule !== null) {
      writeFileSync(scheduleFile, originalSchedule);
    } else if (existsSync(scheduleFile)) {
      unlinkSync(scheduleFile);
    }
  });

  it("IT01: saves a valid schedule", async () => {
    const response = await request(app)
      .put("/api/schedule")
      .send({
        schedule: validSchedule,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.schedule).toEqual(validSchedule);
  });

  it("IT02: rejects an invalid schedule", async () => {
    const invalidSchedule = {
      ...validSchedule,
      weekdays: [],
    };

    const response = await request(app)
      .put("/api/schedule")
      .send({
        schedule: invalidSchedule,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    expect(response.body.errors).toContain(
      "Select at least one weekday."
    );
  });

  it("IT03: retrieves the saved schedule", async () => {
    const saveResponse = await request(app)
      .put("/api/schedule")
      .send({
        schedule: validSchedule,
      });

    expect(saveResponse.status).toBe(200);

    const response = await request(app)
      .get("/api/schedule");

    expect(response.status).toBe(200);
    expect(response.body.schedule).toEqual(validSchedule);
  });

  it("IT04: saves and retrieves an updated schedule", async () => {
    const updatedSchedule: ScheduleConfig = {
      ...validSchedule,
      frequency: "daily",
      weekdays: [],
    };

    const saveResponse = await request(app)
      .put("/api/schedule")
      .send({
        schedule: updatedSchedule,
      });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.success).toBe(true);

    const response = await request(app)
      .get("/api/schedule");

    expect(response.status).toBe(200);
    expect(response.body.schedule).toEqual(updatedSchedule);
    expect(response.body.schedule.frequency).toBe("daily");
  });
});
