import type { Peer, SessionRow } from "../../lib/peerspace";
import type { Collaboration, Screen } from "../../types/app";
import { NewPeersWidget } from "../widgets/NewPeersWidget";
import { OpenCollabsWidget } from "../widgets/OpenCollabsWidget";
import { QuoteCard } from "../widgets/QuoteCard";
import { SpotlightWidget } from "../widgets/SpotlightWidget";
import { ActivityIndexWidget } from "../widgets/ActivityIndexWidget";
import { TrendingSkillsWidget } from "../widgets/TrendingSkillsWidget";
import { UpcomingSessionWidget } from "../widgets/UpcomingSessionWidget";

export function RightPanel({
  activeScreen,
  peers,
  sessions,
  collaborations,
  currentUserId,
  onNavigate,
  onConnectPeer,
  onOpenSessionConversation,
  onApplyToCollaborate
}: {
  activeScreen: Screen;
  peers: Peer[];
  sessions: SessionRow[];
  collaborations: Collaboration[];
  currentUserId: string;
  onNavigate: (screen: Screen) => void;
  onConnectPeer: (peer: Peer) => void;
  onOpenSessionConversation: (session: SessionRow) => void;
  onApplyToCollaborate: (collab: Collaboration) => void;
}) {
  if (activeScreen === "search") {
    return (
      <aside className="right-panel" aria-label="Search widgets">
        <SpotlightWidget />
        <ActivityIndexWidget />
        <TrendingSkillsWidget />
      </aside>
    );
  }

  return (
    <aside className="right-panel" aria-label="Campus widgets">
      <UpcomingSessionWidget
        sessions={sessions}
        onNavigate={onNavigate}
        onOpenSessionConversation={onOpenSessionConversation}
      />
      <NewPeersWidget peers={peers} onConnect={onConnectPeer} />
      <OpenCollabsWidget
        collaborations={collaborations}
        currentUserId={currentUserId}
        onApply={onApplyToCollaborate}
      />
      <QuoteCard />
    </aside>
  );
}
