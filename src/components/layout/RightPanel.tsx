import type { Peer, SessionRow } from "../../lib/peerspace";
import type { Screen } from "../../types/app";
import { NewPeersWidget } from "../widgets/NewPeersWidget";
import { QuoteCard } from "../widgets/QuoteCard";
import { SpotlightWidget } from "../widgets/SpotlightWidget";
import { ActivityIndexWidget } from "../widgets/ActivityIndexWidget";
import { TrendingSkillsWidget } from "../widgets/TrendingSkillsWidget";
import { UpcomingSessionWidget } from "../widgets/UpcomingSessionWidget";

export function RightPanel({
  activeScreen,
  peers,
  sessions,
  onNavigate,
  onConnectPeer,
  onOpenSessionConversation
}: {
  activeScreen: Screen;
  peers: Peer[];
  sessions: SessionRow[];
  onNavigate: (screen: Screen) => void;
  onConnectPeer: (peer: Peer) => void;
  onOpenSessionConversation: (session: SessionRow) => void;
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

  if (activeScreen !== "home") {
    return null;
  }

  return (
    <aside className="right-panel" aria-label="Campus widgets">
      <UpcomingSessionWidget
        sessions={sessions}
        onNavigate={onNavigate}
        onOpenSessionConversation={onOpenSessionConversation}
      />
      <NewPeersWidget peers={peers} onConnect={onConnectPeer} />
      <QuoteCard />
    </aside>
  );
}
