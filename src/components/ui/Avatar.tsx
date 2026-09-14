import type { Peer } from "../../lib/peerspace";

export function Avatar({
  peer,
  size = "md"
}: {
  peer: Peer;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const imageUrl = peer.avatarUrl || peer.github?.avatarUrl;
  return (
    <span className={`avatar ${size}`}>
      {imageUrl ? <img src={imageUrl} alt="" className="avatar-image" /> : peer.initials}
    </span>
  );
}
