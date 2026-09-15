import { SignOut } from "@phosphor-icons/react";
import type { NavItem } from "../../constants/navigation";
import type { Peer } from "../../lib/peerspace";
import type { Screen } from "../../types/app";
import { Avatar } from "../ui/Avatar";
import { VerifiedBadge } from "../ui/VerifiedBadge";

export function Sidebar({
  activeScreen,
  items,
  profile,
  onNavigate,
  onLogout
}: {
  activeScreen: Screen;
  items: NavItem[];
  profile: Peer;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="sidebar-top">
        <div className="brand">
          <span className="brand-mark">PS</span>
          <div>
            <strong>PeerSpace</strong>
            <span className="network-pill">Campus network</span>
          </div>
        </div>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={activeScreen === item.id ? "nav-item active" : "nav-item"}
            aria-current={activeScreen === item.id ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.badge && <em>{item.badge}</em>}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <Avatar peer={profile} />
        <div>
          <strong>{profile.name}</strong>
          <span>{profile.department}</span>
          <VerifiedBadge />
        </div>
        <button className="logout-button" onClick={onLogout}>
          <SignOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
