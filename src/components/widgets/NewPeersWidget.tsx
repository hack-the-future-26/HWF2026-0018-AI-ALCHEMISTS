import type { Peer } from "../../lib/peerspace";
import { Avatar } from "../ui/Avatar";
import { SectionHeader } from "../ui/SectionHeader";
import { SkillTag } from "../ui/SkillTag";

export function NewPeersWidget({
  peers,
  onConnect
}: {
  peers: Peer[];
  onConnect: (peer: Peer) => void;
}) {
  // The peer directory arrives sorted by name (for search), so re-sort here to
  // surface the most recently created accounts.
  const newestPeers = [...peers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <article className="widget card">
      <SectionHeader label="New on campus" compact />
      {newestPeers.length === 0 ? (
        <p className="profile-meta">No other verified students yet.</p>
      ) : (
        <div className="compact-peer-list">
          {newestPeers.map((peer) => (
            <div className="compact-peer" key={peer.id}>
              <Avatar peer={peer} />
              <div>
                <strong>{peer.name}</strong>
                {peer.skills[0] && <SkillTag label={peer.skills[0].name} />}
              </div>
              <button className="btn btn-secondary" onClick={() => onConnect(peer)}>
                Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
