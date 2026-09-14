import type { Collaboration } from "../../types/app";
import { Avatar } from "../ui/Avatar";
import { SkillTag } from "../ui/SkillTag";

export function CollabCard({
  collab,
  compact = false,
  currentUserId,
  onApply
}: {
  collab: Collaboration;
  compact?: boolean;
  currentUserId: string;
  onApply: (collab: Collaboration) => void;
}) {
  const isOwnPost = collab.owner.id === currentUserId;

  return (
    <article className={compact ? "collab-card card compact" : "collab-card card"}>
      <span className="tag wants">{collab.meetingWindow || "Flexible schedule"}</span>
      <h3>{collab.title}</h3>
      <p>{collab.description}</p>
      <div className="tag-cloud">
        {collab.skills.map((skill) => (
          <SkillTag key={skill} label={skill} />
        ))}
      </div>
      <footer>
        <div className="avatar-stack">
          <Avatar peer={collab.owner} size="xs" />
          <span>{collab.owner.name}</span>
        </div>
        {isOwnPost ? (
          <span className="tag">Your post</span>
        ) : (
          <button className="btn btn-primary" onClick={() => onApply(collab)}>
            Apply to collaborate
          </button>
        )}
      </footer>
    </article>
  );
}
