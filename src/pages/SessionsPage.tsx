import { useState } from "react";
import { PageIntro } from "../components/ui/PageIntro";
import { sessionStatusLabel } from "../constants/navigation";
import { formatSessionTime, type SessionRow } from "../lib/peerspace";
import type { Screen } from "../types/app";

export function SessionsPage({
  sessions,
  onOpenConversation,
  onCompleteSession,
  onNavigate
}: {
  sessions: SessionRow[];
  onOpenConversation: (session: SessionRow) => void;
  onCompleteSession: (session: SessionRow) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="page-stack">
      <PageIntro
        title="Sessions stay focused and easy to join."
        body="Track confirmed calls, room locations, prep notes, and post-session reviews."
      />
      <section className="session-grid">
        {sessions.length === 0 && (
          <p className="profile-meta">
            No sessions yet — request one from a peer's profile in Search.
          </p>
        )}
        {sessions.map((session) => {
          const isExpanded = expandedId === session.id;
          return (
            <article className="session-card card" key={session.id}>
              <div>
                <span className="tag wants">{sessionStatusLabel[session.status]}</span>
                <h3>{session.topic}</h3>
                <p>
                  {formatSessionTime(session.scheduledFor)} with {session.peer.name}
                </p>
                {isExpanded && (
                  <div className="session-detail">
                    <p>
                      <strong>Peer:</strong> {session.peer.name} · {session.peer.department},{" "}
                      {session.peer.year}
                    </p>
                    <p>
                      <strong>Status:</strong> {sessionStatusLabel[session.status]}
                    </p>
                    {session.notes && (
                      <p>
                        <strong>Location / notes:</strong> {session.notes}
                      </p>
                    )}
                    <div className="button-row">
                      <button
                        className="btn btn-primary"
                        onClick={() => onOpenConversation(session)}
                      >
                        Message {session.peer.name}
                      </button>
                      {session.status === "confirmed" && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => onCompleteSession(session)}
                        >
                          Mark complete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                {isExpanded ? "Hide details" : "Details"}
              </button>
            </article>
          );
        })}
      </section>
      {sessions.length <= 2 && (
        <div className="sparse-state-card">
          <strong>Your next learning session starts here</strong>
          <button className="btn btn-secondary" onClick={() => onNavigate("search")}>
            Browse peers to schedule
          </button>
        </div>
      )}
    </div>
  );
}
