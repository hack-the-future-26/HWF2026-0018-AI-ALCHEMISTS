import type { Peer } from "../../lib/peerspace";

export function Avatar({
  peer,
  size = "md"
}: {
  peer: Peer;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  return <span className={`avatar ${size}`}>{peer.initials}</span>;
}
