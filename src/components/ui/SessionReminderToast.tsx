import { X, Clock } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { Peer } from "../../lib/peerspace";

export type SessionReminderToastData = {
  id: string;
  peer: Peer;
  topic: string;
  minutesUntil: number;
};

export function SessionReminderToastStack({
  toasts,
  onDismiss,
  onOpen
}: {
  toasts: SessionReminderToastData[];
  onDismiss: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="message-toast-stack" aria-live="polite" aria-label="Session reminders">
      {toasts.map((toast) => (
        <SessionReminderToast key={toast.id} toast={toast} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}

function SessionReminderToast({
  toast,
  onDismiss,
  onOpen
}: {
  toast: SessionReminderToastData;
  onDismiss: (id: string) => void;
  onOpen: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const initials = toast.peer.initials || toast.peer.name.slice(0, 2).toUpperCase();
  const minutesLabel =
    toast.minutesUntil <= 0 ? "starting now" : `starts in ${toast.minutesUntil} min`;

  return (
    <div className="message-toast" role="alert">
      <button
        className="message-toast-body"
        onClick={() => {
          onDismiss(toast.id);
          onOpen();
        }}
        aria-label={`Session with ${toast.peer.name} ${minutesLabel}. Click to open Sessions.`}
      >
        <span className="message-toast-icon">
          <Clock size={16} weight="fill" />
        </span>
        <span className="message-toast-avatar" aria-hidden="true">
          {toast.peer.avatarUrl ? <img src={toast.peer.avatarUrl} alt="" /> : initials}
        </span>
        <span className="message-toast-content">
          <strong className="message-toast-name">
            {toast.peer.name} · {minutesLabel}
          </strong>
          <span className="message-toast-text">{toast.topic}</span>
        </span>
      </button>
      <button
        className="message-toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} weight="bold" />
      </button>
      <span className="message-toast-progress" />
    </div>
  );
}
