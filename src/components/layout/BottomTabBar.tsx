import { ChatCircle, House, MagnifyingGlass, Trophy, UserCircle } from "@phosphor-icons/react";
import type { Screen } from "../../types/app";

const TABS: { id: Screen; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "search", label: "Find Peers", icon: MagnifyingGlass },
  { id: "messages", label: "Messages", icon: ChatCircle },
  { id: "rewards", label: "Rewards", icon: Trophy },
  { id: "profile", label: "Profile", icon: UserCircle }
];

export function BottomTabBar({
  activeScreen,
  unreadMessages,
  onNavigate
}: {
  activeScreen: Screen;
  unreadMessages: number;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav className="bottom-tab-bar" aria-label="Primary navigation">
      {TABS.map((tab) => {
        const isActive = activeScreen === tab.id;
        return (
          <button
            key={tab.id}
            className={isActive ? "bottom-tab active" : "bottom-tab"}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(tab.id)}
          >
            <span className="bottom-tab-icon">
              <tab.icon size={20} weight={isActive ? "fill" : "regular"} />
              {tab.id === "messages" && unreadMessages > 0 && (
                <em className="bottom-tab-badge">{unreadMessages}</em>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
