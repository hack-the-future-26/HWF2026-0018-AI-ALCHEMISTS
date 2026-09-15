import { List, MagnifyingGlass, MoonStars, Sun } from "@phosphor-icons/react";
import { useState } from "react";

export function TopBar({
  pageTitle,
  peerCoins,
  isDarkMode,
  onToggleDarkMode,
  onSearchPeople,
  onOpenMenu
}: {
  pageTitle: string;
  peerCoins: number;
  isDarkMode: boolean;
  onToggleDarkMode: (origin: { x: number; y: number }) => void;
  onSearchPeople: (query: string) => void;
  onOpenMenu: () => void;
}) {
  const [query, setQuery] = useState("");
  // Only spin the icon after a real toggle, not on every page load.
  const [hasToggledTheme, setHasToggledTheme] = useState(false);

  return (
    <header className="topbar">
      <button className="hamburger-button" onClick={onOpenMenu} aria-label="Open menu">
        <List size={20} />
      </button>
      <div className="breadcrumb">{pageTitle}</div>
      <form
        className="global-search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchPeople(query);
        }}
      >
        <MagnifyingGlass size={16} />
        <input
          placeholder="Find a person by skill, name, or department"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <div className="topbar-actions">
        <span className="topbar-coins" title="Your PeerCoins balance">
          🪙 {peerCoins}
        </span>
        <button
          className="theme-toggle"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHasToggledTheme(true);
            onToggleDarkMode({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span
            key={isDarkMode ? "sun" : "moon"}
            className={hasToggledTheme ? "theme-toggle-icon spin-in" : "theme-toggle-icon"}
          >
            {isDarkMode ? <Sun size={18} /> : <MoonStars size={18} />}
          </span>
        </button>
      </div>
    </header>
  );
}
