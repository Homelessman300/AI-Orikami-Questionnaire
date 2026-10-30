
import cron from "node-cron";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";


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
    return { notifications: [], lastReminderDate: null };
  }

  return JSON.parse(readFileSync(dataFile, "utf8"));
}

function saveStore(store: NotificationStore) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

export function getNotifications(): Notification[] {
  return loadStore().notifications;
}

export function markNotificationRead(id: string): boolean {
  const store = loadStore();
  const notification = store.notifications.find((n) => n.id === id);

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

export function startNotificationScheduler() {
  cron.schedule(
    "* * * * *",
    () => {
      const store = loadStore();

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Amsterdam",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      if (store.lastReminderDate === today) return;

      store.notifications.unshift({
        id: randomUUID(),
        title: "Questionnaire reminder",
        message: "A questionnaire is available to complete.",
        createdAt: new Date().toISOString(),
        read: false,
      });

      store.lastReminderDate = today;
      saveStore(store);
    },
    { timezone: "Europe/Amsterdam" }
  );
}
