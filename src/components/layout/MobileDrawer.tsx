import { Bell, CalendarCheck, GearSix, SignOut, UsersThree, X } from "@phosphor-icons/react";
import type { Screen } from "../../types/app";

const DRAWER_ITEMS: { id: Screen; label: string; icon: typeof UsersThree }[] = [
  { id: "collaborations", label: "Collaborations", icon: UsersThree },
  { id: "sessions", label: "Sessions", icon: CalendarCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: GearSix }
];

export function MobileDrawer({
  isOpen,
  onClose,
  onNavigate,
  onLogout
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div
        className={isOpen ? "mobile-drawer-backdrop open" : "mobile-drawer-backdrop"}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={isOpen ? "mobile-drawer open" : "mobile-drawer"} aria-label="More navigation">
        <div className="mobile-drawer-head">
          <strong>Menu</strong>
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="mobile-drawer-list">
          {DRAWER_ITEMS.map((item) => (
            <button
              key={item.id}
              className="mobile-drawer-item"
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          className="mobile-drawer-item logout"
          onClick={() => {
            onLogout();
            onClose();
          }}
        >
          <SignOut size={18} />
          Log out
        </button>
      </div>
    </>
  );
}
