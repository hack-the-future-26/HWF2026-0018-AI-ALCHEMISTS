import type { Collaboration } from "../../types/app";
import { SectionHeader } from "../ui/SectionHeader";

export function OpenCollabsWidget({
  collaborations,
  currentUserId,
  onApply
}: {
  collaborations: Collaboration[];
  currentUserId: string;
  onApply: (collab: Collaboration) => void;
}) {
  const openForOthers = collaborations.filter((collab) => collab.owner.id !== currentUserId);

  return (
    <article className="widget card">
      <SectionHeader label="Looking for teammates" compact />
      {openForOthers.length === 0 ? (
        <p className="profile-meta">No open collaborations yet.</p>
      ) : (
        <div className="compact-collab-list">
          {openForOthers.slice(0, 3).map((collab) => (
            <div className="compact-collab" key={collab.id}>
              <div>
                <strong>{collab.title}</strong>
                <span>{collab.meetingWindow || "Flexible schedule"}</span>
              </div>
              <button className="btn btn-secondary" onClick={() => onApply(collab)}>
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
