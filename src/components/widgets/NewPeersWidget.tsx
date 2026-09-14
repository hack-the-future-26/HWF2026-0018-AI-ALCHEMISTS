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
  return (
    <article className="widget card">
      <SectionHeader label="New on campus" compact />
      {peers.length === 0 ? (
        <p className="profile-meta">No other verified students yet.</p>
      ) : (
        <div className="compact-peer-list">
          {peers.slice(0, 5).map((peer) => (
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
