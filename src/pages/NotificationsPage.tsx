import { Bell } from "@phosphor-icons/react";
import { PageIntro } from "../components/ui/PageIntro";
import { notificationKindLabel } from "../constants/navigation";
import { formatRelative, type NotificationRow } from "../lib/peerspace";

export function NotificationsPage({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <div className="page-stack">
      <PageIntro
        title="Requests, alerts, and updates without noise."
        body="Notifications are grouped by messages, sessions, collaborations, and profile views."
      />
      <section className="notification-list">
        {notifications.length === 0 && (
          <p className="profile-meta">You're all caught up — no notifications yet.</p>
        )}
        {notifications.map((notification) => (
          <article
            className={
              notification.status === "unread" ? "notification-row card unread" : "notification-row card"
            }
            key={notification.id}
          >
            <span className="icon-box">
              <Bell size={16} />
            </span>
            <div>
              <strong>{notification.title || notificationKindLabel[notification.kind]}</strong>
              <p>{notification.body}</p>
            </div>
            <time>{formatRelative(notification.createdAt)}</time>
          </article>
        ))}
      </section>
    </div>
  );
}
