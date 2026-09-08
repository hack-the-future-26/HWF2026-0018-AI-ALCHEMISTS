import { MapPin } from "@phosphor-icons/react";
import type { Peer } from "../../lib/peerspace";
import { Avatar } from "../ui/Avatar";
import { SectionHeader } from "../ui/SectionHeader";
import { SkillTag } from "../ui/SkillTag";
import { VerifiedBadge } from "../ui/VerifiedBadge";

export function StudentCard({
  peer,
  isGoodMatch = false,
  onMessage,
  onInviteToCollaborate,
  onScheduleSession
}: {
  peer: Peer;
  isGoodMatch?: boolean;
  onMessage: (peer: Peer) => void;
  onInviteToCollaborate: (peer: Peer) => void;
  onScheduleSession: (peer: Peer) => void;
}) {
  const offered = peer.skills.filter((skill) => skill.type === "knows");
  const wants = peer.skills.filter((skill) => skill.type === "wants");

  return (
    <article className="student-card card">
      <div className="student-head">
        <Avatar peer={peer} size="lg" />
        <div>
          <div className="identity-line">
            <h3>{peer.name}</h3>
            <VerifiedBadge />
            {isGoodMatch && <span className="tag wants">Good match</span>}
          </div>
          <p>
            {peer.year}, {peer.department}
          </p>
          <span className="location">
            <MapPin size={14} /> {peer.building}
          </span>
        </div>
      </div>
      <blockquote>{peer.bio}</blockquote>
      <div className="skill-columns">
        <div>
          <SectionHeader label={`Skills ${peer.name} offers`} compact />
          <div className="tag-cloud">
            {offered.map((skill) => (
              <SkillTag key={skill.name} label={skill.name} />
            ))}
          </div>
        </div>
        <div>
          <SectionHeader label="Wants to learn" compact />
          <div className="tag-cloud">
            {wants.map((skill) => (
              <SkillTag key={skill.name} label={skill.name} wants />
            ))}
          </div>
        </div>
      </div>
      <footer>
        <span>{peer.active}</span>
        <div>
          <button className="btn btn-secondary" onClick={() => onMessage(peer)}>
            Message
          </button>
          <button className="btn btn-secondary" onClick={() => onInviteToCollaborate(peer)}>
            Invite to Collaborate
          </button>
          <button className="btn btn-primary" onClick={() => onScheduleSession(peer)}>
            Schedule Session
          </button>
        </div>
      </footer>
    </article>
  );
}
