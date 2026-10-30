
import cron from "node-cron";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  getSchedule,
  type ScheduleConfig,
} from "./schedules.ts";

export type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type NotificationStore = {
  notifications: Notification[];
  lastReminderDate: string | null;
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "notifications.json");

function loadStore(): NotificationStore {
  if (!existsSync(dataFile)) {
    return {
      notifications: [],
      lastReminderDate: null,
    };
  }

  return JSON.parse(
    readFileSync(dataFile, "utf8")
  ) as NotificationStore;
}

function saveStore(store: NotificationStore) {
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(
    dataFile,
    JSON.stringify(store, null, 2)
  );
}

export function getNotifications(): Notification[] {
  return loadStore().notifications;
}

export function markNotificationRead(
  id: string
): boolean {
  const store = loadStore();

  const notification = store.notifications.find(
    (item) => item.id === id
  );

  if (!notification) return false;

  notification.read = true;
  saveStore(store);

  return true;
}

export function createNotification(
  title: string,
  message: string
): Notification {
  const store = loadStore();

  const notification: Notification = {
    id: randomUUID(),
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };

  store.notifications.unshift(notification);
  saveStore(store);

  return notification;
}

function getAmsterdamDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function isScheduledDay(
  schedule: ScheduleConfig,
  today: string
): boolean {
  if (
    today < schedule.startDate ||
    today > schedule.endDate
  ) {
    return false;
  }

  const dayOfWeek = new Date(
    `${today}T12:00:00Z`
  ).getUTCDay();

  switch (schedule.frequency) {
    case "daily":
      return true;

    case "weekly":
      return schedule.weekdays.includes(dayOfWeek);

    case "monthly":
      return today.slice(8, 10) ===
        schedule.startDate.slice(8, 10);

    case "specific":
      return schedule.specificDates.includes(today);
  }
}

function shouldSendReminder(
  schedule: ScheduleConfig,
  today: string
): boolean {
  if (!schedule.remindersEnabled) return false;

  if (!isScheduledDay(schedule, today)) return false;

  if (schedule.reminderFrequency === "daily") {
    return true;
  }

  if (schedule.reminderFrequency === "weekly") {
    const start = new Date(
      `${schedule.startDate}T12:00:00Z`
    );

    const current = new Date(
      `${today}T12:00:00Z`
    );

    const daysSinceStart = Math.floor(
      (current.getTime() - start.getTime()) /
        86400000
    );

    return daysSinceStart % 7 === 0;
  }

  return true;
}

export function startNotificationScheduler() {
  cron.schedule(
    "* * * * *",
    () => {
      try {
        const schedule = getSchedule();

        if (!schedule) return;

        const { date, time } =
          getAmsterdamDateTime(new Date());

        if (time !== schedule.availableAt) return;

        if (!shouldSendReminder(schedule, date)) return;

        const store = loadStore();

        if (store.lastReminderDate === date) return;

        store.notifications.unshift({
          id: randomUUID(),
          title: "Questionnaire Reminder",
          message:
            "A scheduled questionnaire is now available to complete.",
          createdAt: new Date().toISOString(),
          read: false,
        });

        store.lastReminderDate = date;

        saveStore(store);

        console.log(
          `Scheduled notification created for ${date}`
        );
      } catch (error) {
        console.error(
          "Notification scheduler failed:",
          error
        );
      }
    },
    {
      timezone: "Europe/Amsterdam",
    }
  );
}
