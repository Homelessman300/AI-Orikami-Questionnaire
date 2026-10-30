
import { useEffect, useState } from "react";
import "../style/notificationBell.css";

type Notification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const API_URL = "http://localhost:3000";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    try {
      const response = await fetch(`${API_URL}/api/notifications`);
      if (!response.ok) return;

      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Could not load notifications:", error);
    }
  }

  useEffect(() => {
    void loadNotifications();

    const interval = setInterval(() => {
      void loadNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}/read`,
        { method: "PATCH" }
      );

      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error("Could not mark notification as read:", error);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-container">
      <button
        type="button"
        className="notification-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Notifications, ${unreadCount} unread`}
      >
        <span>🔔</span>
        <span>Notifications</span>

        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <h3 className="notification-title">Notifications</h3>

          {notifications.length === 0 && (
            <p className="notification-empty">No notifications yet.</p>
          )}

          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${
                  notification.read ? "read" : "unread"
                }`}
              >
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>

                <small>
                  {new Date(notification.createdAt).toLocaleString()}
                </small>

                {!notification.read && (
                  <button
                    type="button"
                    className="notification-read-button"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
