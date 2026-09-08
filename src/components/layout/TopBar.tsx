import { MagnifyingGlass, MoonStars, Sun } from "@phosphor-icons/react";
import { useState } from "react";
import { formatClockTime } from "../../lib/appStorage";

export function TopBar({
  pageTitle,
  isDarkMode,
  onToggleDarkMode,
  now,
  onSearchPeople
}: {
  pageTitle: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  now: Date;
  onSearchPeople: (query: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <header className="topbar">
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
      <time className="clock" dateTime={now.toISOString()}>
        {formatClockTime(now)}
      </time>
      <button
        className="theme-toggle"
        onClick={onToggleDarkMode}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? <Sun size={18} /> : <MoonStars size={18} />}
      </button>
    </header>
  );
}
