import { X, ChatCircleText } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { Peer } from "../../lib/peerspace";

export type MessageToastData = {
  id: string;
  sender: Peer;
  body: string;
};

export function MessageToastStack({
  toasts,
  onDismiss,
  onOpen,
}: {
  toasts: MessageToastData[];
  onDismiss: (id: string) => void;
  onOpen: (senderId: string) => void;
}) {
  return (
    <div className="message-toast-stack" aria-live="polite" aria-label="New message notifications">
      {toasts.map((toast) => (
        <MessageToast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function MessageToast({
  toast,
  onDismiss,
  onOpen,
}: {
  toast: MessageToastData;
  onDismiss: (id: string) => void;
  onOpen: (senderId: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const initials = toast.sender.initials || toast.sender.name.slice(0, 2).toUpperCase();
  const truncatedBody =
    toast.body.length > 72 ? toast.body.slice(0, 72).trimEnd() + "…" : toast.body;

  return (
    <div className="message-toast" role="alert">
      <button
        className="message-toast-body"
        onClick={() => onOpen(toast.sender.id)}
        aria-label={`Message from ${toast.sender.name}: ${toast.body}. Click to open conversation.`}
      >
        <span className="message-toast-icon">
          <ChatCircleText size={16} weight="fill" />
        </span>
        <span className="message-toast-avatar" aria-hidden="true">
          {toast.sender.avatarUrl ? (
            <img src={toast.sender.avatarUrl} alt="" />
          ) : (
            initials
          )}
        </span>
        <span className="message-toast-content">
          <strong className="message-toast-name">{toast.sender.name}</strong>
          <span className="message-toast-text">{truncatedBody}</span>
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
