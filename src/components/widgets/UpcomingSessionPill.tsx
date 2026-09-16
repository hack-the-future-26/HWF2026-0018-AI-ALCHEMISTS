import { CalendarCheck, X } from "@phosphor-icons/react";
import { formatSessionTime, type SessionRow } from "../../lib/peerspace";

export function UpcomingSessionPill({
  session,
  onOpen,
  onDismiss
}: {
  session: SessionRow;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside className="session-pill" aria-label="Upcoming session">
      <button className="session-pill-body" type="button" onClick={onOpen}>
        <span className="session-pill-icon">
          <CalendarCheck size={15} weight="fill" />
        </span>
        <span className="session-pill-text">
          <strong>{session.topic}</strong>
          <small>
            {formatSessionTime(session.scheduledFor)} · {session.peer.name}
          </small>
        </span>
      </button>
      <button
        className="session-pill-close"
        type="button"
        onClick={onDismiss}
        aria-label="Hide upcoming session"
      >
        <X size={13} weight="bold" />
      </button>
    </aside>
  );
}
