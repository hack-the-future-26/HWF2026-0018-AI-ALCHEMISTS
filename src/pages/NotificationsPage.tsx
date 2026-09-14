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
      {notifications.length <= 1 && (
        <div className="empty-state">
          <p className="empty-state-title">You&apos;re all caught up 👋</p>
          <p className="empty-state-body">
            New notifications appear when peers message you, review your sessions, or join your
            collaborations.
          </p>
        </div>
      )}
    </div>
  );
}
