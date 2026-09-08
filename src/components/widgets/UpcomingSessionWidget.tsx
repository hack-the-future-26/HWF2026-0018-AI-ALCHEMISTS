import { sessionStatusLabel } from "../../constants/navigation";
import { formatSessionTime, type SessionRow } from "../../lib/peerspace";
import type { Screen } from "../../types/app";
import { SectionHeader } from "../ui/SectionHeader";

export function UpcomingSessionWidget({
  sessions,
  onNavigate,
  onOpenSessionConversation
}: {
  sessions: SessionRow[];
  onNavigate: (screen: Screen) => void;
  onOpenSessionConversation: (session: SessionRow) => void;
}) {
  const upcoming = sessions.find(
    (session) => session.status === "requested" || session.status === "confirmed"
  );

  if (!upcoming) {
    return (
      <article className="widget card">
        <div className="widget-top">
          <SectionHeader label="Upcoming Session" compact />
        </div>
        <p className="profile-meta">
          No upcoming sessions yet — request one from a peer's profile in Search.
        </p>
        <div className="button-row">
          <button className="btn btn-secondary" onClick={() => onNavigate("search")}>
            Find a peer
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="widget card">
      <div className="widget-top">
        <SectionHeader label="Upcoming Session" compact />
        <span className="tag wants">{sessionStatusLabel[upcoming.status]}</span>
      </div>
      <h3>{upcoming.topic}</h3>
      <p>
        With {upcoming.peer.name}, {formatSessionTime(upcoming.scheduledFor)}.
      </p>
      <div className="button-row">
        <button className="btn btn-primary" onClick={() => onOpenSessionConversation(upcoming)}>
          Message
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate("sessions")}>
          Details
        </button>
      </div>
    </article>
  );
}
